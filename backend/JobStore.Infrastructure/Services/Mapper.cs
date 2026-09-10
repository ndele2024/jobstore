using JobStore.Application.DTOs;
using JobStore.Domain.Entities;
using JobStore.Domain.Enums;

namespace JobStore.Infrastructure.Services;

/// <summary>Conversions entites -> DTO, centralisees pour eviter la duplication entre services.</summary>
internal static class Mapper
{
    public static AuthUserDto ToAuthUser(UserAccount user) => new(
        user.Id,
        user.Role,
        user.DisplayName,
        user.Email,
        user.FirstName,
        user.LastName,
        user.CompanyName,
        user.EmailVerified);

    public static EducationDto ToDto(Education e) => new(
        e.Id, e.SchoolName, e.City, e.Country, e.DiplomaName, e.FieldOfStudy,
        e.StartDate, e.EndDate, e.IsCurrent, e.DiplomaObtained,
        e.ExpectedGraduationDate, e.AccumulatedCredits, e.Gpa);

    public static ExperienceDto ToDto(Experience x) => new(
        x.Id, x.JobTitle, x.CompanyName, x.City, x.Country,
        x.StartDate, x.EndDate, x.IsCurrent, x.Tasks.ToArray());

    public static LanguageDto ToDto(LanguageSkill l) => new(l.Id, l.Name, l.Level);

    public static CertificationDto ToDto(Certification c) => new(
        c.Id, c.Name, c.Issuer, c.IssueDate, c.ExpirationDate, c.CredentialId);

    public static ResumeDto ToDto(ResumeDocument r) => new(
        r.Id, r.FileName, r.ContentType, r.SizeInBytes, r.IsDefault, r.UploadedAtUtc);

    public static EmployeeProfileDto ToProfile(UserAccount u) => new(
        u.Id, u.FirstName, u.LastName, u.Email, u.Phone, u.AddressLine, u.City, u.Country, u.PostalCode,
        u.Headline, u.Summary,
        u.Skills.ToArray(),
        u.Educations.OrderByDescending(e => e.StartDate).Select(ToDto).ToArray(),
        u.Experiences.OrderByDescending(e => e.StartDate).Select(ToDto).ToArray(),
        u.Languages.Select(ToDto).ToArray(),
        u.Certifications.OrderByDescending(c => c.IssueDate).Select(ToDto).ToArray(),
        u.Resumes.OrderByDescending(r => r.UploadedAtUtc).Select(ToDto).ToArray(),
        CompletionPercentage(u));

    public static EmployerProfileDto ToEmployerProfile(UserAccount u) => new(
        u.Id, u.CompanyName, u.Email, u.Phone, u.AddressLine, u.City, u.Country, u.PostalCode,
        u.WebsiteUrl, u.Sectors.ToArray(), u.Headline, u.Summary);

    public static JobCardDto ToCard(JobOffer job, int? matchPercentage = null) => new(
        job.Id, job.Title, job.EmployerName, job.Domain, job.Sector, job.City, job.Country,
        job.SalaryMin, job.SalaryMax, job.ContractType, job.WorkMode, job.DisplayUntil,
        job.Status, job.IsExternal, job.CreatedAtUtc, matchPercentage);

    public static JobDetailsDto ToDetails(
        JobOffer job,
        int viewCount,
        int applicationCount,
        int? matchPercentage,
        IReadOnlyCollection<string> matchedSkills,
        IReadOnlyCollection<string> missingSkills,
        bool hasApplied) => new(
        job.Id, job.EmployerId, job.Title, job.EmployerName, job.Domain, job.Sector, job.City, job.Country,
        job.SalaryMin, job.SalaryMax, job.ContractType, job.WorkMode, job.StartDate, job.DisplayUntil,
        job.Description, job.RequiredSkills.ToArray(), job.Responsibilities.ToArray(),
        job.Status, job.IsExternal, job.ExternalApplyUrl,
        viewCount, applicationCount, job.CreatedAtUtc,
        matchPercentage, matchedSkills, missingSkills, hasApplied);

    public static JobApplicantDto ToApplicant(JobApplication application, UserAccount candidate) => new(
        application.Id,
        candidate.Id,
        candidate.DisplayName,
        candidate.Email,
        candidate.Phone,
        candidate.City,
        candidate.Country,
        candidate.Headline,
        application.ResumeId,
        application.ResumeName,
        application.CoverLetter,
        application.Status,
        application.MatchPercentage,
        application.MatchedSkills.ToArray(),
        application.MissingSkills.ToArray(),
        candidate.Skills.ToArray(),
        candidate.Languages.Select(ToDto).ToArray(),
        candidate.Educations.OrderByDescending(e => e.StartDate).Select(ToDto).ToArray(),
        candidate.Experiences.OrderByDescending(e => e.StartDate).Select(ToDto).ToArray(),
        candidate.Certifications.Select(ToDto).ToArray(),
        application.EmployerNote,
        application.SubmittedAtUtc);

    public static MyApplicationDto ToMyApplication(JobApplication application, JobOffer job) => new(
        application.Id,
        job.Id,
        job.Title,
        job.EmployerName,
        job.City,
        job.Country,
        application.Status,
        application.MatchPercentage,
        application.ResumeName,
        application.CoverLetter,
        application.SubmittedAtUtc,
        application.UpdatedAtUtc,
        job.DisplayUntil);

    /// <summary>Sections manquantes du profil candidat, utilisees pour guider l'utilisateur.</summary>
    public static List<string> MissingSections(UserAccount u)
    {
        var missing = new List<string>();
        if (string.IsNullOrWhiteSpace(u.Phone)) missing.Add("Telephone");
        if (string.IsNullOrWhiteSpace(u.Headline)) missing.Add("Titre professionnel");
        if (u.Skills.Count == 0) missing.Add("Competences");
        if (u.Educations.Count == 0) missing.Add("Etudes");
        if (u.Experiences.Count == 0) missing.Add("Experiences");
        if (u.Languages.Count == 0) missing.Add("Langues");
        if (u.Resumes.Count == 0) missing.Add("CV");
        return missing;
    }

    /// <summary>Taux de completion du profil, sur 8 sections.</summary>
    public static int CompletionPercentage(UserAccount u)
    {
        var checks = new[]
        {
            !string.IsNullOrWhiteSpace(u.FirstName) && !string.IsNullOrWhiteSpace(u.LastName),
            !string.IsNullOrWhiteSpace(u.Phone),
            !string.IsNullOrWhiteSpace(u.City) && !string.IsNullOrWhiteSpace(u.Country),
            !string.IsNullOrWhiteSpace(u.Headline),
            u.Skills.Count > 0,
            u.Educations.Count > 0,
            u.Experiences.Count > 0,
            u.Languages.Count > 0,
            u.Resumes.Count > 0
        };

        return (int)Math.Round(checks.Count(c => c) * 100d / checks.Length, MidpointRounding.AwayFromZero);
    }

    public static string Label(ApplicationStatus status) => status switch
    {
        ApplicationStatus.Submitted => "Soumise",
        ApplicationStatus.InReview => "En analyse",
        ApplicationStatus.Shortlisted => "Preselectionnee",
        ApplicationStatus.Rejected => "Refusee",
        ApplicationStatus.Accepted => "Acceptee",
        _ => status.ToString()
    };

    public static string Label(JobStatus status) => status switch
    {
        JobStatus.Draft => "Brouillon",
        JobStatus.Published => "Publiee",
        JobStatus.Closed => "Fermee",
        JobStatus.Deleted => "Supprimee",
        JobStatus.External => "Externe",
        _ => status.ToString()
    };

    public static string Label(ContractType type) => type switch
    {
        ContractType.FullTime => "Temps plein",
        ContractType.PartTime => "Temps partiel",
        ContractType.Contract => "Contrat",
        ContractType.Internship => "Stage",
        ContractType.Freelance => "Pigiste",
        _ => type.ToString()
    };

    public static string Label(WorkMode mode) => mode switch
    {
        WorkMode.OnSite => "Sur place",
        WorkMode.Hybrid => "Hybride",
        WorkMode.Remote => "Teletravail",
        _ => mode.ToString()
    };

    public static string Label(LanguageLevel level) => level switch
    {
        LanguageLevel.Beginner => "Debutant",
        LanguageLevel.Intermediate => "Intermediaire",
        LanguageLevel.Advanced => "Avance",
        LanguageLevel.Fluent => "Courant",
        LanguageLevel.Native => "Langue maternelle",
        _ => level.ToString()
    };
}
