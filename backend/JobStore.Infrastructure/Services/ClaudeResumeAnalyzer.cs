using System.Diagnostics;
using System.Globalization;
using System.Text.Json;
using Anthropic;
using Anthropic.Exceptions;
using Anthropic.Models.Beta.Messages;
using JobStore.Application.Abstractions;
using JobStore.Application.DTOs;
using JobStore.Domain.Enums;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace JobStore.Infrastructure.Services;

/// <summary>Options liees a la section "Anthropic" de la configuration.</summary>
public class AnthropicOptions
{
    public const string SectionName = "Anthropic";

    /// <summary>
    /// Cle d'API. Ne jamais la mettre dans appsettings.json (le depot est versionne):
    /// utiliser <c>dotnet user-secrets</c> en developpement ou la variable d'environnement
    /// <c>Anthropic__ApiKey</c> / <c>ANTHROPIC_API_KEY</c> en production.
    /// </summary>
    public string? ApiKey { get; set; }

    public string Model { get; set; } = "claude-opus-5";

    /// <summary>Profondeur de raisonnement: low, medium, high, xhigh, max.</summary>
    public string Effort { get; set; } = "medium";

    public int MaxTokens { get; set; } = 16000;
}

/// <summary>
/// Analyse d'un CV par l'API Claude.
///
/// Le CV est envoye nativement (PDF) ou sous forme de texte extrait (DOCX, DOC, TXT),
/// avec un schema JSON impose via les sorties structurees: la reponse est garantie
/// conforme au schema, il n'y a donc pas de JSON a "reparer".
/// </summary>
public sealed class ClaudeResumeAnalyzer : IResumeAnalyzer
{
    private const string ServerSideFallbackBeta = "server-side-fallback-2026-07-01";

    private readonly AnthropicOptions _options;
    private readonly ILogger<ClaudeResumeAnalyzer> _logger;
    private readonly Lazy<AnthropicClient> _client;

    public ClaudeResumeAnalyzer(IOptions<AnthropicOptions> options, ILogger<ClaudeResumeAnalyzer> logger)
    {
        _options = options.Value;
        _logger = logger;

        // Repli sur la variable d'environnement standard du SDK.
        _options.ApiKey ??= Environment.GetEnvironmentVariable("ANTHROPIC_API_KEY");

        _client = new Lazy<AnthropicClient>(() => new AnthropicClient { ApiKey = _options.ApiKey });
    }

    public bool IsConfigured => !string.IsNullOrWhiteSpace(_options.ApiKey);

    public async Task<Result<ResumeAnalysisDto>> AnalyzeAsync(
        Guid resumeId,
        string fileName,
        byte[] content,
        CancellationToken cancellationToken)
    {
        var documentBlock = BuildDocumentBlock(fileName, content);
        if (documentBlock is null)
        {
            return Result<ResumeAnalysisDto>.Fail(
                "Le contenu de ce fichier n'a pas pu etre lu. Essayez avec une version PDF ou DOCX du CV.", 422);
        }

        var parameters = new MessageCreateParams
        {
            Model = _options.Model,
            MaxTokens = _options.MaxTokens,
            Betas = [ServerSideFallbackBeta],
            // Si le modele refuse, l'API relance automatiquement la requete sur un modele de repli adapte.
            Fallbacks = new Default(),
            System = ResumeExtractionPrompt.System,
            OutputConfig = new BetaOutputConfig
            {
                Effort = _options.Effort,
                Format = new BetaJsonOutputFormat { Schema = ResumeExtractionPrompt.Schema },
            },
            Messages =
            [
                new BetaMessageParam
                {
                    Role = Role.User,
                    Content = new List<BetaContentBlockParam>
                    {
                        documentBlock,
                        new BetaTextBlockParam
                        {
                            Text = $"Voici le CV « {fileName} ». Extrais-en les informations selon le schema demande.",
                        },
                    },
                },
            ],
        };

        var stopwatch = Stopwatch.StartNew();
        BetaMessage response;

        try
        {
            response = await _client.Value.Beta.Messages.Create(parameters, cancellationToken);
        }
        catch (AnthropicRateLimitException exception)
        {
            _logger.LogWarning(exception, "Analyse de CV: limite de debit de l'API Claude atteinte.");
            return Result<ResumeAnalysisDto>.Fail(
                "Le service d'analyse est tres sollicite. Reessayez dans une minute.", 429);
        }
        catch (AnthropicBadRequestException exception)
        {
            // Un 400 peut venir du document (PDF protege, trop long...) OU de notre propre requete
            // (schema, parametre invalide). On ne blame le document que si l'API le designe.
            if (IsDocumentError(exception.Message))
            {
                _logger.LogWarning(exception, "Analyse de CV: document refuse par l'API Claude.");
                return Result<ResumeAnalysisDto>.Fail(
                    "Ce fichier n'a pas pu etre analyse (document illisible, protege ou trop volumineux).", 422);
            }

            _logger.LogError(exception, "Analyse de CV: requete invalide envoyee a l'API Claude (erreur de configuration).");
            return Result<ResumeAnalysisDto>.Fail(
                "L'analyse a echoue suite a une erreur de configuration du serveur. Vous pouvez remplir le profil manuellement.", 500);
        }
        catch (AnthropicApiException exception)
        {
            _logger.LogError(exception, "Analyse de CV: erreur de l'API Claude.");
            return Result<ResumeAnalysisDto>.Fail(
                "Le service d'analyse est momentanement indisponible. Vous pouvez remplir le profil manuellement.", 503);
        }
        catch (Exception exception) when (!cancellationToken.IsCancellationRequested)
        {
            _logger.LogError(exception, "Analyse de CV: impossible de joindre l'API Claude.");
            return Result<ResumeAnalysisDto>.Fail(
                "Le service d'analyse est injoignable. Vous pouvez remplir le profil manuellement.", 503);
        }

        _logger.LogInformation(
            "Analyse de CV terminee en {ElapsedMs} ms (modele {Model}, arret {StopReason}, jetons entree {InputTokens} / sortie {OutputTokens}).",
            stopwatch.ElapsedMilliseconds,
            response.Model,
            response.StopReason,
            response.Usage.InputTokens,
            response.Usage.OutputTokens);

        if (response.StopReason == "refusal")
        {
            return Result<ResumeAnalysisDto>.Fail(
                "Ce document n'a pas pu etre analyse automatiquement. Completez le profil manuellement.", 422);
        }

        if (response.StopReason == "max_tokens")
        {
            return Result<ResumeAnalysisDto>.Fail(
                "Le CV est trop long pour etre analyse en une fois. Completez le profil manuellement.", 422);
        }

        var json = string.Concat(response.Content
            .Select(block => block.TryPickText(out var text) ? text.Text : string.Empty));

        try
        {
            var extracted = JsonSerializer.Deserialize<ExtractedResume>(json, ResumeExtractionPrompt.JsonOptions)
                            ?? throw new JsonException("Reponse vide.");

            return Result<ResumeAnalysisDto>.Ok(Map(resumeId, fileName, extracted));
        }
        catch (JsonException exception)
        {
            _logger.LogError(exception, "Analyse de CV: reponse JSON inexploitable.");
            return Result<ResumeAnalysisDto>.Fail(
                "La reponse du service d'analyse est inexploitable. Reessayez.", 502);
        }
    }

    /// <summary>PDF envoye tel quel; les autres formats sont convertis en texte.</summary>
    private static BetaContentBlockParam? BuildDocumentBlock(string fileName, byte[] content)
    {
        var extension = Path.GetExtension(fileName).ToLowerInvariant();

        if (extension == ".pdf")
        {
            return new BetaRequestDocumentBlock
            {
                Title = fileName,
                Source = new BetaBase64PdfSource { Data = Convert.ToBase64String(content) },
            };
        }

        string text;
        try
        {
            text = ResumeTextExtractor.Extract(extension, content);
        }
        catch (Exception)
        {
            return null;
        }

        if (string.IsNullOrWhiteSpace(text))
        {
            return null;
        }

        return new BetaRequestDocumentBlock
        {
            Title = fileName,
            Source = new BetaPlainTextSource { Data = text },
        };
    }

    // -----------------------------------------------------------------------
    // Conversion de la reponse du modele vers les DTO de l'application
    // -----------------------------------------------------------------------

    private static ResumeAnalysisDto Map(Guid resumeId, string fileName, ExtractedResume source)
    {
        var info = source.PersonalInfo ?? new ExtractedPersonal();

        return new ResumeAnalysisDto(
            resumeId,
            fileName,
            new ExtractedPersonalInfoDto(
                Clean(info.FirstName), Clean(info.LastName), Clean(info.Email), Clean(info.Phone),
                Clean(info.AddressLine), Clean(info.City), Clean(info.Country), Clean(info.PostalCode),
                Clean(info.Headline), Clean(info.Summary)),
            CleanList(source.Skills),
            (source.Educations ?? []).Select(e => new ExtractedEducationDto(
                Clean(e.SchoolName), Clean(e.City), Clean(e.Country), Clean(e.DiplomaName), Clean(e.FieldOfStudy),
                ParseDate(e.StartDate), e.IsCurrent ? null : ParseDate(e.EndDate), e.IsCurrent,
                ParseDiplomaObtained(e.DiplomaObtained), ParseDate(e.ExpectedGraduationDate),
                e.AccumulatedCredits, e.Gpa)).ToArray(),
            (source.Experiences ?? []).Select(x => new ExtractedExperienceDto(
                Clean(x.JobTitle), Clean(x.CompanyName), Clean(x.City), Clean(x.Country),
                ParseDate(x.StartDate), x.IsCurrent ? null : ParseDate(x.EndDate), x.IsCurrent,
                CleanList(x.Tasks))).ToArray(),
            (source.Languages ?? [])
                .Where(l => !string.IsNullOrWhiteSpace(l.Name))
                .Select(l => new ExtractedLanguageDto(
                    l.Name!.Trim(),
                    Enum.TryParse<LanguageLevel>(l.Level, ignoreCase: true, out var level) ? level : null))
                .ToArray(),
            (source.Certifications ?? [])
                .Where(c => !string.IsNullOrWhiteSpace(c.Name))
                .Select(c => new ExtractedCertificationDto(
                    c.Name!.Trim(), Clean(c.Issuer), ParseDate(c.IssueDate), ParseDate(c.ExpirationDate),
                    Clean(c.CredentialId)))
                .ToArray());
    }

    private static string? Clean(string? value) => string.IsNullOrWhiteSpace(value) ? null : value.Trim();

    private static string[] CleanList(IEnumerable<string?>? values) => (values ?? [])
        .Select(Clean)
        .Where(v => v is not null)
        .Select(v => v!)
        .Distinct(StringComparer.OrdinalIgnoreCase)
        .ToArray();

    /// <summary>Chaine vide ou date mal formee: l'information est consideree comme absente.</summary>
    private static DateOnly? ParseDate(string? value) =>
        DateOnly.TryParseExact(value?.Trim(), "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.None, out var date)
            ? date
            : null;

    private static bool? ParseDiplomaObtained(string? value) => value switch
    {
        ResumeExtractionPrompt.DiplomaObtainedYes => true,
        ResumeExtractionPrompt.DiplomaObtainedNo => false,
        _ => null
    };

    /// <summary>
    /// Vrai si le message d'erreur de l'API concerne le document envoye
    /// (et non la construction de la requete). Le message brut reste dans les journaux.
    /// </summary>
    private static bool IsDocumentError(string exceptionMessage)
    {
        var apiMessage = exceptionMessage;
        var jsonStart = exceptionMessage.IndexOf('{');

        if (jsonStart >= 0)
        {
            try
            {
                using var body = JsonDocument.Parse(exceptionMessage[jsonStart..]);
                apiMessage = body.RootElement.GetProperty("error").GetProperty("message").GetString() ?? exceptionMessage;
            }
            catch (Exception)
            {
                // Corps non JSON: on analyse le message complet.
            }
        }

        string[] documentMarkers = ["pdf", "document", "page", "password", "encrypted", "too long", "too large", "exceed"];
        return documentMarkers.Any(marker => apiMessage.Contains(marker, StringComparison.OrdinalIgnoreCase));
    }

    // Forme brute renvoyee par le modele (voir le schema dans ResumeExtractionPrompt).
    private sealed record ExtractedResume(
        ExtractedPersonal? PersonalInfo,
        string?[]? Skills,
        ExtractedEducation[]? Educations,
        ExtractedExperience[]? Experiences,
        ExtractedLanguage[]? Languages,
        ExtractedCertification[]? Certifications);

    private sealed record ExtractedPersonal(
        string? FirstName = null, string? LastName = null, string? Email = null, string? Phone = null,
        string? AddressLine = null, string? City = null, string? Country = null, string? PostalCode = null,
        string? Headline = null, string? Summary = null);

    private sealed record ExtractedEducation(
        string? SchoolName, string? City, string? Country, string? DiplomaName, string? FieldOfStudy,
        string? StartDate, string? EndDate, bool IsCurrent, string? DiplomaObtained,
        string? ExpectedGraduationDate, int? AccumulatedCredits, decimal? Gpa);

    private sealed record ExtractedExperience(
        string? JobTitle, string? CompanyName, string? City, string? Country,
        string? StartDate, string? EndDate, bool IsCurrent, string?[]? Tasks);

    private sealed record ExtractedLanguage(string? Name, string? Level);

    private sealed record ExtractedCertification(
        string? Name, string? Issuer, string? IssueDate, string? ExpirationDate, string? CredentialId);
}
