using System.IO.Compression;
using System.Text;
using System.Text.RegularExpressions;
using JobStore.Application.Abstractions;
using JobStore.Application.DTOs;

namespace JobStore.Infrastructure.Services;

/// <summary>
/// Lecture heuristique d'un CV pour pre-remplir le formulaire de profil.
///
/// Formats geres:
///  - .txt  : lecture directe
///  - .docx : decompression ZIP puis extraction du texte de word/document.xml
///  - .pdf  : extraction des segments de texte non compresses (partielle par nature)
///  - .doc  : ancien format binaire, extraction best effort des chaines lisibles
///
/// Le resultat est une PROPOSITION: l'utilisateur valide ou corrige chaque champ.
/// </summary>
public partial class ResumeParser : IResumeParser
{
    private static readonly string[] KnownSkills =
    [
        "Angular", "React", "Vue", "TypeScript", "JavaScript", "HTML", "CSS", "SCSS",
        "C#", "ASP.NET", ".NET", "Java", "Python", "PHP", "Ruby", "Go", "Rust", "Kotlin", "Swift",
        "SQL", "PostgreSQL", "MySQL", "SQL Server", "Oracle", "MongoDB", "Redis",
        "REST", "GraphQL", "Docker", "Kubernetes", "Azure", "AWS", "GCP", "Terraform",
        "Git", "CI/CD", "Jenkins", "Agile", "Scrum", "Kanban", "Jira",
        "UX", "UI", "Figma", "Adobe XD", "Photoshop", "Illustrator",
        "Excel", "Power BI", "Tableau", "ETL", "Machine Learning", "Data Science",
        "Comptabilite", "Marketing", "Vente", "Service a la clientele", "Bureautique",
        "Gestion de projet", "Communication", "Leadership", "Organisation"
    ];

    private static readonly string[] KnownLanguages =
    [
        "Francais", "Anglais", "Espagnol", "Allemand", "Italien", "Portugais",
        "Arabe", "Mandarin", "Russe", "Creole", "Wolof"
    ];

    public ResumeParsingResultDto Parse(string fileName, string contentType, byte[] content)
    {
        var extension = Path.GetExtension(fileName).ToLowerInvariant();
        var (text, supported, message) = ExtractText(extension, content);

        if (!supported)
        {
            return new ResumeParsingResultDto(
                null, null, null, null, null, null, [], [], [], [], string.Empty, false, message);
        }

        var normalized = Normalize(text);

        var email = EmailRegex().Match(normalized).Value;
        var phone = PhoneRegex().Match(normalized).Value.Trim();
        var skills = KnownSkills
            .Where(skill => ContainsWord(normalized, skill))
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToArray();
        var languages = KnownLanguages
            .Where(language => ContainsWord(normalized, language))
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToArray();

        var (firstName, lastName) = GuessName(normalized, email);
        var (city, country) = GuessLocation(normalized);

        var preview = normalized.Length > 800 ? normalized[..800] + "..." : normalized;

        return new ResumeParsingResultDto(
            firstName,
            lastName,
            string.IsNullOrWhiteSpace(email) ? null : email,
            string.IsNullOrWhiteSpace(phone) ? null : phone,
            city,
            country,
            skills,
            languages,
            [],
            [],
            preview,
            true,
            skills.Length == 0 && string.IsNullOrWhiteSpace(email)
                ? "Le fichier a ete lu mais peu d'informations exploitables ont ete detectees. Completez le formulaire manuellement."
                : "Lecture automatique terminee. Verifiez et corrigez les champs proposes avant d'enregistrer.");
    }

    private static (string Text, bool Supported, string Message) ExtractText(string extension, byte[] content)
    {
        try
        {
            return extension switch
            {
                ".txt" => (Encoding.UTF8.GetString(content), true, string.Empty),
                ".docx" => (ExtractFromDocx(content), true, string.Empty),
                ".pdf" => (ExtractFromPdf(content), true, string.Empty),
                ".doc" => (ExtractPrintable(content), true, string.Empty),
                _ => (string.Empty, false, "Format non supporte. Utilisez un fichier .pdf, .doc, .docx ou .txt.")
            };
        }
        catch (Exception)
        {
            return (string.Empty, false, "Le fichier a ete enregistre mais n'a pas pu etre analyse automatiquement.");
        }
    }

    /// <summary>Un .docx est une archive ZIP: word/document.xml contient le texte.</summary>
    private static string ExtractFromDocx(byte[] content)
    {
        using var stream = new MemoryStream(content);
        using var archive = new ZipArchive(stream, ZipArchiveMode.Read);

        var entry = archive.GetEntry("word/document.xml");
        if (entry is null)
        {
            return string.Empty;
        }

        using var reader = new StreamReader(entry.Open(), Encoding.UTF8);
        var xml = reader.ReadToEnd();

        xml = ParagraphRegex().Replace(xml, "\n");
        xml = TabRegex().Replace(xml, " ");
        return XmlTagRegex().Replace(xml, string.Empty);
    }

    /// <summary>Extraction partielle du texte PDF: seuls les blocs non compresses sont lisibles sans librairie dediee.</summary>
    private static string ExtractFromPdf(byte[] content)
    {
        var raw = Encoding.Latin1.GetString(content);
        var builder = new StringBuilder();

        foreach (Match match in PdfTextRegex().Matches(raw))
        {
            builder.Append(match.Groups[1].Value).Append(' ');
        }

        var extracted = builder.ToString();
        return string.IsNullOrWhiteSpace(extracted) ? ExtractPrintable(content) : extracted;
    }

    /// <summary>Recupere les sequences de caracteres imprimables d'un binaire.</summary>
    private static string ExtractPrintable(byte[] content)
    {
        var builder = new StringBuilder();
        var run = new StringBuilder();

        foreach (var b in content)
        {
            var c = (char)b;
            if (char.IsLetterOrDigit(c) || char.IsPunctuation(c) || c == ' ' || c == '@' || c == '+')
            {
                run.Append(c);
                continue;
            }

            if (run.Length >= 4)
            {
                builder.Append(run).Append('\n');
            }

            run.Clear();
        }

        if (run.Length >= 4)
        {
            builder.Append(run);
        }

        return builder.ToString();
    }

    private static string Normalize(string text) =>
        WhitespaceRegex().Replace(text.Replace("\r", "\n"), " ").Trim();

    private static bool ContainsWord(string text, string word) =>
        Regex.IsMatch(text, $@"(^|[^\p{{L}}]){Regex.Escape(word)}([^\p{{L}}]|$)", RegexOptions.IgnoreCase);

    /// <summary>Le nom est generalement sur la premiere ligne, avant le courriel.</summary>
    private static (string? FirstName, string? LastName) GuessName(string text, string email)
    {
        var head = text.Length > 120 ? text[..120] : text;
        if (!string.IsNullOrWhiteSpace(email))
        {
            var index = head.IndexOf(email, StringComparison.OrdinalIgnoreCase);
            if (index > 0)
            {
                head = head[..index];
            }
        }

        var words = head
            .Split([' ', '\n', '\t', ',', ';'], StringSplitOptions.RemoveEmptyEntries)
            .Where(w => w.Length > 1 && w.All(char.IsLetter))
            .Take(2)
            .ToArray();

        return words.Length switch
        {
            >= 2 => (Capitalize(words[0]), Capitalize(words[1])),
            1 => (Capitalize(words[0]), null),
            _ => (null, null)
        };
    }

    private static (string? City, string? Country) GuessLocation(string text)
    {
        string[] cities =
        [
            "Montreal", "Quebec", "Laval", "Longueuil", "Gatineau", "Sherbrooke",
            "Toronto", "Ottawa", "Vancouver", "Calgary", "Paris", "Lyon", "Dakar", "Abidjan", "Douala"
        ];
        string[] countries = ["Canada", "France", "Belgique", "Suisse", "Senegal", "Cote d'Ivoire", "Cameroun"];

        var city = cities.FirstOrDefault(c => ContainsWord(text, c));
        var country = countries.FirstOrDefault(c => ContainsWord(text, c)) ?? (city is null ? null : "Canada");
        return (city, country);
    }

    private static string Capitalize(string value) =>
        value.Length <= 1 ? value.ToUpperInvariant() : char.ToUpperInvariant(value[0]) + value[1..].ToLowerInvariant();

    [GeneratedRegex(@"[\w\.\-\+]+@[\w\-]+\.[\w\.\-]+")]
    private static partial Regex EmailRegex();

    [GeneratedRegex(@"(\+?\d{1,3}[\s\-\.]?)?\(?\d{3}\)?[\s\-\.]?\d{3}[\s\-\.]?\d{4}")]
    private static partial Regex PhoneRegex();

    [GeneratedRegex(@"\s+")]
    private static partial Regex WhitespaceRegex();

    [GeneratedRegex(@"<[^>]+>")]
    private static partial Regex XmlTagRegex();

    [GeneratedRegex(@"</w:p>")]
    private static partial Regex ParagraphRegex();

    [GeneratedRegex(@"<w:tab[^>]*/>")]
    private static partial Regex TabRegex();

    [GeneratedRegex(@"\(([^)\\]{2,})\)\s*Tj")]
    private static partial Regex PdfTextRegex();
}
