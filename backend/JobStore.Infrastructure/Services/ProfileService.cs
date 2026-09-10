using JobStore.Application.Abstractions;
using JobStore.Application.DTOs;
using JobStore.Domain.Entities;
using JobStore.Domain.Enums;

namespace JobStore.Infrastructure.Services;

/// <summary>Gestion du profil candidat (informations, etudes, experiences, langues, certifications, CV)
/// et du profil entreprise.</summary>
public class ProfileService(IJobStoreRepository repository, IResumeParser resumeParser) : IProfileService
{
    private const long MaxResumeSize = 5 * 1024 * 1024;

    private static readonly string[] AllowedResumeExtensions = [".pdf", ".doc", ".docx", ".txt"];

    // -----------------------------------------------------------------------
    // Informations generales
    // -----------------------------------------------------------------------

    public Result<EmployeeProfileDto> GetEmployeeProfile(Guid userId) =>
        WithEmployee(userId, user => Result<EmployeeProfileDto>.Ok(Mapper.ToProfile(user)));

    public Result<EmployeeProfileDto> UpdatePersonalInfo(Guid userId, UpdatePersonalInfoRequest request) =>
        WithEmployee(userId, user =>
        {
            user.FirstName = request.FirstName.Trim();
            user.LastName = request.LastName.Trim();
            user.Phone = request.Phone.Trim();
            user.AddressLine = request.AddressLine.Trim();
            user.City = request.City.Trim();
            user.Country = request.Country.Trim();
            user.PostalCode = request.PostalCode.Trim();
            user.Headline = request.Headline.Trim();
            user.Summary = request.Summary.Trim();
            return Result<EmployeeProfileDto>.Ok(Mapper.ToProfile(user));
        });

    public Result<EmployeeProfileDto> UpdateSkills(Guid userId, UpdateSkillsRequest request) =>
        WithEmployee(userId, user =>
        {
            user.Skills = request.Skills
                .Select(s => s.Trim())
                .Where(s => s.Length > 0)
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .ToList();
            return Result<EmployeeProfileDto>.Ok(Mapper.ToProfile(user));
        });

    // -----------------------------------------------------------------------
    // Etudes
    // -----------------------------------------------------------------------

    public Result<EducationDto> AddEducation(Guid userId, EducationRequest request) =>
        WithEmployee(userId, user =>
        {
            var error = ValidateEducation(request);
            if (error is not null) return Result<EducationDto>.Fail(error);

            var education = new Education();
            Apply(education, request);
            user.Educations.Add(education);
            return Result<EducationDto>.Ok(Mapper.ToDto(education));
        });

    public Result<EducationDto> UpdateEducation(Guid userId, Guid educationId, EducationRequest request) =>
        WithEmployee(userId, user =>
        {
            var education = user.Educations.FirstOrDefault(e => e.Id == educationId);
            if (education is null) return Result<EducationDto>.NotFound("Formation introuvable.");

            var error = ValidateEducation(request);
            if (error is not null) return Result<EducationDto>.Fail(error);

            Apply(education, request);
            return Result<EducationDto>.Ok(Mapper.ToDto(education));
        });

    public Result DeleteEducation(Guid userId, Guid educationId) =>
        WithEmployeeAction(userId, user =>
            user.Educations.RemoveAll(e => e.Id == educationId) > 0
                ? Result.Ok()
                : Result.NotFound("Formation introuvable."));

    // -----------------------------------------------------------------------
    // Experiences
    // -----------------------------------------------------------------------

    public Result<ExperienceDto> AddExperience(Guid userId, ExperienceRequest request) =>
        WithEmployee(userId, user =>
        {
            var error = ValidateExperience(request);
            if (error is not null) return Result<ExperienceDto>.Fail(error);

            var experience = new Experience();
            Apply(experience, request);
            user.Experiences.Add(experience);
            return Result<ExperienceDto>.Ok(Mapper.ToDto(experience));
        });

    public Result<ExperienceDto> UpdateExperience(Guid userId, Guid experienceId, ExperienceRequest request) =>
        WithEmployee(userId, user =>
        {
            var experience = user.Experiences.FirstOrDefault(e => e.Id == experienceId);
            if (experience is null) return Result<ExperienceDto>.NotFound("Experience introuvable.");

            var error = ValidateExperience(request);
            if (error is not null) return Result<ExperienceDto>.Fail(error);

            Apply(experience, request);
            return Result<ExperienceDto>.Ok(Mapper.ToDto(experience));
        });

    public Result DeleteExperience(Guid userId, Guid experienceId) =>
        WithEmployeeAction(userId, user =>
            user.Experiences.RemoveAll(e => e.Id == experienceId) > 0
                ? Result.Ok()
                : Result.NotFound("Experience introuvable."));

    // -----------------------------------------------------------------------
    // Langues
    // -----------------------------------------------------------------------

    public Result<LanguageDto> AddLanguage(Guid userId, LanguageRequest request) =>
        WithEmployee(userId, user =>
        {
            if (user.Languages.Any(l => l.Name.Equals(request.Name.Trim(), StringComparison.OrdinalIgnoreCase)))
            {
                return Result<LanguageDto>.Fail("Cette langue est deja presente dans votre profil.", 409);
            }

            var language = new LanguageSkill { Name = request.Name.Trim(), Level = request.Level };
            user.Languages.Add(language);
            return Result<LanguageDto>.Ok(Mapper.ToDto(language));
        });

    public Result<LanguageDto> UpdateLanguage(Guid userId, Guid languageId, LanguageRequest request) =>
        WithEmployee(userId, user =>
        {
            var language = user.Languages.FirstOrDefault(l => l.Id == languageId);
            if (language is null) return Result<LanguageDto>.NotFound("Langue introuvable.");

            language.Name = request.Name.Trim();
            language.Level = request.Level;
            return Result<LanguageDto>.Ok(Mapper.ToDto(language));
        });

    public Result DeleteLanguage(Guid userId, Guid languageId) =>
        WithEmployeeAction(userId, user =>
            user.Languages.RemoveAll(l => l.Id == languageId) > 0
                ? Result.Ok()
                : Result.NotFound("Langue introuvable."));

    // -----------------------------------------------------------------------
    // Certifications
    // -----------------------------------------------------------------------

    public Result<CertificationDto> AddCertification(Guid userId, CertificationRequest request) =>
        WithEmployee(userId, user =>
        {
            var certification = new Certification();
            Apply(certification, request);
            user.Certifications.Add(certification);
            return Result<CertificationDto>.Ok(Mapper.ToDto(certification));
        });

    public Result<CertificationDto> UpdateCertification(Guid userId, Guid certificationId, CertificationRequest request) =>
        WithEmployee(userId, user =>
        {
            var certification = user.Certifications.FirstOrDefault(c => c.Id == certificationId);
            if (certification is null) return Result<CertificationDto>.NotFound("Certification introuvable.");

            Apply(certification, request);
            return Result<CertificationDto>.Ok(Mapper.ToDto(certification));
        });

    public Result DeleteCertification(Guid userId, Guid certificationId) =>
        WithEmployeeAction(userId, user =>
            user.Certifications.RemoveAll(c => c.Id == certificationId) > 0
                ? Result.Ok()
                : Result.NotFound("Certification introuvable."));

    // -----------------------------------------------------------------------
    // CV
    // -----------------------------------------------------------------------

    public Result<ResumeUploadResponse> UploadResume(Guid userId, string fileName, string contentType, byte[] content) =>
        WithEmployee(userId, user =>
        {
            var extension = Path.GetExtension(fileName).ToLowerInvariant();

            if (!AllowedResumeExtensions.Contains(extension))
            {
                return Result<ResumeUploadResponse>.Fail(
                    "Format refuse. Formats acceptes: PDF, DOC, DOCX, TXT.", 415);
            }

            if (content.Length == 0)
            {
                return Result<ResumeUploadResponse>.Fail("Le fichier est vide.");
            }

            if (content.Length > MaxResumeSize)
            {
                return Result<ResumeUploadResponse>.Fail("Le fichier depasse la taille maximale de 5 Mo.", 413);
            }

            var resume = new ResumeDocument
            {
                FileName = Path.GetFileName(fileName),
                ContentType = contentType,
                SizeInBytes = content.Length,
                Content = content,
                IsDefault = user.Resumes.Count == 0
            };

            user.Resumes.Add(resume);

            var parsed = resumeParser.Parse(resume.FileName, contentType, content);
            return Result<ResumeUploadResponse>.Ok(new ResumeUploadResponse(Mapper.ToDto(resume), parsed));
        });

    public Result<IReadOnlyCollection<ResumeDto>> GetResumes(Guid userId) =>
        WithEmployee(userId, user => Result<IReadOnlyCollection<ResumeDto>>.Ok(
            user.Resumes.OrderByDescending(r => r.UploadedAtUtc).Select(Mapper.ToDto).ToArray()));

    public Result SetDefaultResume(Guid userId, Guid resumeId) =>
        WithEmployeeAction(userId, user =>
        {
            var resume = user.Resumes.FirstOrDefault(r => r.Id == resumeId);
            if (resume is null) return Result.NotFound("CV introuvable.");

            foreach (var item in user.Resumes)
            {
                item.IsDefault = item.Id == resumeId;
            }

            return Result.Ok();
        });

    public Result DeleteResume(Guid userId, Guid resumeId) =>
        WithEmployeeAction(userId, user =>
        {
            var resume = user.Resumes.FirstOrDefault(r => r.Id == resumeId);
            if (resume is null) return Result.NotFound("CV introuvable.");

            if (repository.Applications.Any(a => a.EmployeeId == userId && a.ResumeId == resumeId))
            {
                return Result.Fail("Ce CV est rattache a une candidature et ne peut pas etre supprime.", 409);
            }

            user.Resumes.Remove(resume);

            // Le CV par defaut doit toujours exister s'il reste au moins un document.
            if (resume.IsDefault && user.Resumes.Count > 0)
            {
                user.Resumes[0].IsDefault = true;
            }

            return Result.Ok();
        });

    /// <summary>Telechargement d'un CV: par son proprietaire, ou par un employeur ayant recu la candidature.</summary>
    public Result<(string FileName, string ContentType, byte[] Content)> DownloadResume(
        Guid requesterId, Guid ownerId, Guid resumeId)
    {
        return repository.Transaction(() =>
        {
            var owner = repository.FindUser(ownerId);
            var resume = owner?.Resumes.FirstOrDefault(r => r.Id == resumeId);

            if (owner is null || resume is null)
            {
                return Result<(string, string, byte[])>.NotFound("CV introuvable.");
            }

            if (requesterId != ownerId)
            {
                var requester = repository.FindUser(requesterId);
                var allowed = requester?.Role == UserRole.Admin ||
                              (requester?.Role == UserRole.Employer &&
                               repository.Applications.Any(a =>
                                   a.EmployeeId == ownerId &&
                                   a.ResumeId == resumeId &&
                                   repository.FindJob(a.JobOfferId)?.EmployerId == requesterId));

                if (!allowed)
                {
                    return Result<(string, string, byte[])>.Forbidden("Vous n'avez pas acces a ce document.");
                }
            }

            return Result<(string, string, byte[])>.Ok((resume.FileName, resume.ContentType, resume.Content));
        });
    }

    // -----------------------------------------------------------------------
    // Profil entreprise
    // -----------------------------------------------------------------------

    public Result<EmployerProfileDto> GetEmployerProfile(Guid userId) =>
        WithEmployer(userId, user => Result<EmployerProfileDto>.Ok(Mapper.ToEmployerProfile(user)));

    public Result<EmployerProfileDto> UpdateEmployerInfo(Guid userId, UpdateEmployerInfoRequest request) =>
        WithEmployer(userId, user =>
        {
            user.CompanyName = request.CompanyName.Trim();
            user.Phone = request.Phone.Trim();
            user.AddressLine = request.AddressLine.Trim();
            user.City = request.City.Trim();
            user.Country = request.Country.Trim();
            user.PostalCode = request.PostalCode.Trim();
            user.WebsiteUrl = request.WebsiteUrl.Trim();
            user.Sectors = request.Sectors.Select(s => s.Trim()).Where(s => s.Length > 0).Distinct().ToList();
            user.Headline = request.Headline.Trim();
            user.Summary = request.Summary.Trim();

            // Le nom affiche sur les offres suit le nom de l'entreprise.
            foreach (var job in repository.Jobs.Where(j => j.EmployerId == userId))
            {
                job.EmployerName = user.CompanyName;
            }

            return Result<EmployerProfileDto>.Ok(Mapper.ToEmployerProfile(user));
        });

    // -----------------------------------------------------------------------
    // Helpers
    // -----------------------------------------------------------------------

    /// <summary>Charge un compte candidat sous verrou et renvoie un resultat type.</summary>
    private Result<T> WithEmployee<T>(Guid userId, Func<UserAccount, Result<T>> action) =>
        repository.Transaction(() =>
        {
            var user = repository.FindUser(userId);
            if (user is null) return Result<T>.NotFound("Compte introuvable.");
            if (user.Role != UserRole.Employee) return Result<T>.Forbidden("Ce compte n'est pas un compte candidat.");
            return action(user);
        });

    /// <summary>Variante sans valeur de retour (suppressions, activations).</summary>
    private Result WithEmployeeAction(Guid userId, Func<UserAccount, Result> action) =>
        repository.Transaction(() =>
        {
            var user = repository.FindUser(userId);
            if (user is null) return Result.NotFound("Compte introuvable.");
            if (user.Role != UserRole.Employee) return Result.Forbidden("Ce compte n'est pas un compte candidat.");
            return action(user);
        });

    private Result<T> WithEmployer<T>(Guid userId, Func<UserAccount, Result<T>> action) =>
        repository.Transaction(() =>
        {
            var user = repository.FindUser(userId);
            if (user is null) return Result<T>.NotFound("Compte introuvable.");
            if (user.Role != UserRole.Employer) return Result<T>.Forbidden("Ce compte n'est pas un compte entreprise.");
            return action(user);
        });

    private static string? ValidateEducation(EducationRequest request)
    {
        if (!request.IsCurrent && request.EndDate is null)
        {
            return "Indiquez une date de fin ou cochez \"etudes en cours\".";
        }

        if (request.EndDate is not null && request.EndDate < request.StartDate)
        {
            return "La date de fin doit etre posterieure a la date de debut.";
        }

        if (!request.DiplomaObtained && request.ExpectedGraduationDate is null)
        {
            return "Indiquez la date d'obtention prevue du diplome.";
        }

        return null;
    }

    private static string? ValidateExperience(ExperienceRequest request)
    {
        if (!request.IsCurrent && request.EndDate is null)
        {
            return "Indiquez une date de fin ou cochez \"emploi en cours\".";
        }

        if (request.EndDate is not null && request.EndDate < request.StartDate)
        {
            return "La date de fin doit etre posterieure a la date de debut.";
        }

        return null;
    }

    private static void Apply(Education education, EducationRequest request)
    {
        education.SchoolName = request.SchoolName.Trim();
        education.City = request.City.Trim();
        education.Country = request.Country.Trim();
        education.DiplomaName = request.DiplomaName.Trim();
        education.FieldOfStudy = request.FieldOfStudy.Trim();
        education.StartDate = request.StartDate;
        education.IsCurrent = request.IsCurrent;
        education.EndDate = request.IsCurrent ? null : request.EndDate;
        education.DiplomaObtained = request.DiplomaObtained;
        education.ExpectedGraduationDate = request.DiplomaObtained ? null : request.ExpectedGraduationDate;
        education.AccumulatedCredits = request.AccumulatedCredits;
        education.Gpa = request.Gpa;
    }

    private static void Apply(Experience experience, ExperienceRequest request)
    {
        experience.JobTitle = request.JobTitle.Trim();
        experience.CompanyName = request.CompanyName.Trim();
        experience.City = request.City.Trim();
        experience.Country = request.Country.Trim();
        experience.StartDate = request.StartDate;
        experience.IsCurrent = request.IsCurrent;
        experience.EndDate = request.IsCurrent ? null : request.EndDate;
        experience.Tasks = request.Tasks.Select(t => t.Trim()).Where(t => t.Length > 0).ToList();
    }

    private static void Apply(Certification certification, CertificationRequest request)
    {
        certification.Name = request.Name.Trim();
        certification.Issuer = request.Issuer.Trim();
        certification.IssueDate = request.IssueDate;
        certification.ExpirationDate = request.ExpirationDate;
        certification.CredentialId = request.CredentialId.Trim();
    }
}
