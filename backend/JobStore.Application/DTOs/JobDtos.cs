using System.ComponentModel.DataAnnotations;
using JobStore.Domain.Enums;

namespace JobStore.Application.DTOs;

/// <summary>Criteres de recherche d'offres. Tous les champs sont optionnels.</summary>
public class JobSearchRequest
{
    public string? Keyword { get; set; }
    public string? Domain { get; set; }
    public string? City { get; set; }
    public string? Country { get; set; }
    public string? Sector { get; set; }
    public decimal? MinimumSalary { get; set; }
    public ContractType? ContractType { get; set; }
    public WorkMode? WorkMode { get; set; }
    public string? SortBy { get; set; }
    [Range(1, 500)] public int Page { get; set; } = 1;
    [Range(1, 100)] public int PageSize { get; set; } = 10;
}

/// <summary>Ligne de resultat, volontairement legere.</summary>
public record JobCardDto(
    Guid Id,
    string Title,
    string EmployerName,
    string Domain,
    string Sector,
    string City,
    string Country,
    decimal SalaryMin,
    decimal SalaryMax,
    ContractType ContractType,
    WorkMode WorkMode,
    DateOnly DisplayUntil,
    JobStatus Status,
    bool IsExternal,
    DateTime CreatedAtUtc,
    int? MatchPercentage);

/// <summary>Page de resultats.</summary>
public record JobSearchResponse(
    IReadOnlyCollection<JobCardDto> Items,
    int TotalCount,
    int Page,
    int PageSize);

/// <summary>Vue detaillee d'une offre pour le candidat et le visiteur.</summary>
public record JobDetailsDto(
    Guid Id,
    Guid EmployerId,
    string Title,
    string EmployerName,
    string Domain,
    string Sector,
    string City,
    string Country,
    decimal SalaryMin,
    decimal SalaryMax,
    ContractType ContractType,
    WorkMode WorkMode,
    DateOnly StartDate,
    DateOnly DisplayUntil,
    string Description,
    IReadOnlyCollection<string> RequiredSkills,
    IReadOnlyCollection<string> Responsibilities,
    JobStatus Status,
    bool IsExternal,
    string ExternalApplyUrl,
    int ViewCount,
    int ApplicationCount,
    DateTime CreatedAtUtc,
    int? MatchPercentage,
    IReadOnlyCollection<string> MatchedSkills,
    IReadOnlyCollection<string> MissingSkills,
    bool HasApplied);

/// <summary>Creation ou modification d'une offre par un employeur.</summary>
public class UpsertJobRequest
{
    [Required, MaxLength(140)] public string Title { get; set; } = string.Empty;
    [Required] public string Domain { get; set; } = string.Empty;
    [Required] public string Sector { get; set; } = string.Empty;
    [Required] public string City { get; set; } = string.Empty;
    [Required] public string Country { get; set; } = string.Empty;
    [Range(0, 1000000)] public decimal SalaryMin { get; set; }
    [Range(0, 1000000)] public decimal SalaryMax { get; set; }
    [Required] public ContractType ContractType { get; set; } = JobStore.Domain.Enums.ContractType.FullTime;
    [Required] public WorkMode WorkMode { get; set; } = JobStore.Domain.Enums.WorkMode.OnSite;
    [Required] public DateOnly StartDate { get; set; }
    [Required] public DateOnly DisplayUntil { get; set; }
    [Required, MinLength(30, ErrorMessage = "La description doit contenir au moins 30 caracteres.")]
    public string Description { get; set; } = string.Empty;
    public List<string> RequiredSkills { get; set; } = [];
    public List<string> Responsibilities { get; set; } = [];
    public JobStatus Status { get; set; } = JobStatus.Published;
}

public class UpdateJobStatusRequest
{
    [Required] public JobStatus Status { get; set; }
}

/// <summary>Candidat vu par l'employeur, sur le detail d'une offre.</summary>
public record JobApplicantDto(
    Guid ApplicationId,
    Guid EmployeeId,
    string CandidateName,
    string Email,
    string Phone,
    string City,
    string Country,
    string Headline,
    Guid? ResumeId,
    string ResumeName,
    string CoverLetter,
    ApplicationStatus Status,
    int MatchPercentage,
    IReadOnlyCollection<string> MatchedSkills,
    IReadOnlyCollection<string> MissingSkills,
    IReadOnlyCollection<string> Skills,
    IReadOnlyCollection<LanguageDto> Languages,
    IReadOnlyCollection<EducationDto> Educations,
    IReadOnlyCollection<ExperienceDto> Experiences,
    IReadOnlyCollection<CertificationDto> Certifications,
    string EmployerNote,
    DateTime SubmittedAtUtc);

/// <summary>Visiteur ayant consulte une offre (statistiques employeur).</summary>
public record JobViewerDto(
    Guid UserId,
    string DisplayName,
    string City,
    string Country,
    int ViewCount,
    bool HasApplied,
    DateTime LastViewedAtUtc);

/// <summary>Vue employeur complete d'une offre.</summary>
public record EmployerJobDetailsDto(
    JobDetailsDto Job,
    IReadOnlyCollection<JobApplicantDto> Applicants,
    IReadOnlyCollection<JobViewerDto> Viewers);

// ---------------------------------------------------------------------------
// Candidatures
// ---------------------------------------------------------------------------

public class SubmitApplicationRequest
{
    [Required] public Guid ResumeId { get; set; }
    [MaxLength(5000)] public string? CoverLetter { get; set; }
    public string? CoverLetterFileName { get; set; }
}

public class UpdateApplicationStatusRequest
{
    [Required] public ApplicationStatus Status { get; set; }
    [MaxLength(500)] public string? Note { get; set; }
}

/// <summary>Candidature vue par le candidat.</summary>
public record MyApplicationDto(
    Guid Id,
    Guid JobId,
    string JobTitle,
    string EmployerName,
    string City,
    string Country,
    ApplicationStatus Status,
    int MatchPercentage,
    string ResumeName,
    string CoverLetter,
    DateTime SubmittedAtUtc,
    DateTime UpdatedAtUtc,
    DateOnly DisplayUntil);
