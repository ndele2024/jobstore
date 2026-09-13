using System.ComponentModel.DataAnnotations;
using JobStore.Domain.Enums;

namespace JobStore.Application.DTOs;

// ---------------------------------------------------------------------------
// Informations personnelles
// ---------------------------------------------------------------------------

public class UpdatePersonalInfoRequest
{
    [Required, MaxLength(80)] public string FirstName { get; set; } = string.Empty;
    [Required, MaxLength(80)] public string LastName { get; set; } = string.Empty;
    [Required, Phone] public string Phone { get; set; } = string.Empty;
    public string AddressLine { get; set; } = string.Empty;
    [Required] public string City { get; set; } = string.Empty;
    [Required] public string Country { get; set; } = string.Empty;
    public string PostalCode { get; set; } = string.Empty;
    [MaxLength(120)] public string Headline { get; set; } = string.Empty;
    [MaxLength(1200)] public string Summary { get; set; } = string.Empty;
}

public class UpdateEmployerInfoRequest
{
    [Required, MaxLength(120)] public string CompanyName { get; set; } = string.Empty;
    [Required, Phone] public string Phone { get; set; } = string.Empty;
    public string AddressLine { get; set; } = string.Empty;
    [Required] public string City { get; set; } = string.Empty;
    [Required] public string Country { get; set; } = string.Empty;
    public string PostalCode { get; set; } = string.Empty;
    public string WebsiteUrl { get; set; } = string.Empty;
    [Required, MinLength(1)] public List<string> Sectors { get; set; } = [];
    [MaxLength(120)] public string Headline { get; set; } = string.Empty;
    [MaxLength(1200)] public string Summary { get; set; } = string.Empty;
}

// ---------------------------------------------------------------------------
// Etudes
// ---------------------------------------------------------------------------

public class EducationRequest
{
    [Required] public string SchoolName { get; set; } = string.Empty;
    [Required] public string City { get; set; } = string.Empty;
    [Required] public string Country { get; set; } = string.Empty;
    [Required] public string DiplomaName { get; set; } = string.Empty;
    [Required] public string FieldOfStudy { get; set; } = string.Empty;
    [Required] public DateOnly StartDate { get; set; }
    public DateOnly? EndDate { get; set; }
    public bool IsCurrent { get; set; }
    public bool DiplomaObtained { get; set; }
    public DateOnly? ExpectedGraduationDate { get; set; }
    [Range(0, 300)] public int? AccumulatedCredits { get; set; }
    [Range(0, 100)] public decimal? Gpa { get; set; }
}

public record EducationDto(
    Guid Id,
    string SchoolName,
    string City,
    string Country,
    string DiplomaName,
    string FieldOfStudy,
    DateOnly StartDate,
    DateOnly? EndDate,
    bool IsCurrent,
    bool DiplomaObtained,
    DateOnly? ExpectedGraduationDate,
    int? AccumulatedCredits,
    decimal? Gpa);

// ---------------------------------------------------------------------------
// Experiences
// ---------------------------------------------------------------------------

public class ExperienceRequest
{
    [Required] public string JobTitle { get; set; } = string.Empty;
    [Required] public string CompanyName { get; set; } = string.Empty;
    [Required] public string City { get; set; } = string.Empty;
    [Required] public string Country { get; set; } = string.Empty;
    [Required] public DateOnly StartDate { get; set; }
    public DateOnly? EndDate { get; set; }
    public bool IsCurrent { get; set; }
    public List<string> Tasks { get; set; } = [];
}

public record ExperienceDto(
    Guid Id,
    string JobTitle,
    string CompanyName,
    string City,
    string Country,
    DateOnly StartDate,
    DateOnly? EndDate,
    bool IsCurrent,
    IReadOnlyCollection<string> Tasks);

// ---------------------------------------------------------------------------
// Langues et certifications
// ---------------------------------------------------------------------------

public class LanguageRequest
{
    [Required] public string Name { get; set; } = string.Empty;
    [Required] public LanguageLevel Level { get; set; }
}

public record LanguageDto(Guid Id, string Name, LanguageLevel Level);

public class CertificationRequest
{
    [Required] public string Name { get; set; } = string.Empty;
    [Required] public string Issuer { get; set; } = string.Empty;
    public DateOnly? IssueDate { get; set; }
    public DateOnly? ExpirationDate { get; set; }
    public string CredentialId { get; set; } = string.Empty;
}

public record CertificationDto(
    Guid Id,
    string Name,
    string Issuer,
    DateOnly? IssueDate,
    DateOnly? ExpirationDate,
    string CredentialId);

// ---------------------------------------------------------------------------
// Competences et CV
// ---------------------------------------------------------------------------

public class UpdateSkillsRequest
{
    public List<string> Skills { get; set; } = [];
}

public record ResumeDto(
    Guid Id,
    string FileName,
    string ContentType,
    long SizeInBytes,
    bool IsDefault,
    DateTime UploadedAtUtc);

// ---------------------------------------------------------------------------
// Analyse d'un CV par l'API Claude
//
// Tous les champs sont nullables: une information absente du CV reste vide.
// Ces DTO sont une PROPOSITION de pre-remplissage; rien n'est enregistre tant
// que l'utilisateur n'a pas valide la selection cote interface.
// ---------------------------------------------------------------------------

public record ExtractedPersonalInfoDto(
    string? FirstName,
    string? LastName,
    string? Email,
    string? Phone,
    string? AddressLine,
    string? City,
    string? Country,
    string? PostalCode,
    string? Headline,
    string? Summary);

public record ExtractedEducationDto(
    string? SchoolName,
    string? City,
    string? Country,
    string? DiplomaName,
    string? FieldOfStudy,
    DateOnly? StartDate,
    DateOnly? EndDate,
    bool IsCurrent,
    bool? DiplomaObtained,
    DateOnly? ExpectedGraduationDate,
    int? AccumulatedCredits,
    decimal? Gpa);

public record ExtractedExperienceDto(
    string? JobTitle,
    string? CompanyName,
    string? City,
    string? Country,
    DateOnly? StartDate,
    DateOnly? EndDate,
    bool IsCurrent,
    IReadOnlyCollection<string> Tasks);

public record ExtractedLanguageDto(string Name, LanguageLevel? Level);

public record ExtractedCertificationDto(
    string Name,
    string? Issuer,
    DateOnly? IssueDate,
    DateOnly? ExpirationDate,
    string? CredentialId);

/// <summary>Resultat complet de l'analyse d'un CV.</summary>
public record ResumeAnalysisDto(
    Guid ResumeId,
    string ResumeFileName,
    ExtractedPersonalInfoDto PersonalInfo,
    IReadOnlyCollection<string> Skills,
    IReadOnlyCollection<ExtractedEducationDto> Educations,
    IReadOnlyCollection<ExtractedExperienceDto> Experiences,
    IReadOnlyCollection<ExtractedLanguageDto> Languages,
    IReadOnlyCollection<ExtractedCertificationDto> Certifications);

// ---------------------------------------------------------------------------
// Profil complet
// ---------------------------------------------------------------------------

public record EmployeeProfileDto(
    Guid Id,
    string FirstName,
    string LastName,
    string Email,
    string Phone,
    string AddressLine,
    string City,
    string Country,
    string PostalCode,
    string Headline,
    string Summary,
    IReadOnlyCollection<string> Skills,
    IReadOnlyCollection<EducationDto> Educations,
    IReadOnlyCollection<ExperienceDto> Experiences,
    IReadOnlyCollection<LanguageDto> Languages,
    IReadOnlyCollection<CertificationDto> Certifications,
    IReadOnlyCollection<ResumeDto> Resumes,
    int CompletionPercentage);

public record EmployerProfileDto(
    Guid Id,
    string CompanyName,
    string Email,
    string Phone,
    string AddressLine,
    string City,
    string Country,
    string PostalCode,
    string WebsiteUrl,
    IReadOnlyCollection<string> Sectors,
    string Headline,
    string Summary);
