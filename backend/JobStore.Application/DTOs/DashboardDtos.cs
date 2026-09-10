using JobStore.Domain.Enums;

namespace JobStore.Application.DTOs;

/// <summary>Carte de resume du profil affichee en haut du tableau de bord candidat.</summary>
public record ProfileSummaryDto(
    Guid UserId,
    string DisplayName,
    UserRole Role,
    string Headline,
    string Location,
    string Email,
    string Phone,
    int CompletionPercentage,
    IReadOnlyCollection<string> Skills,
    IReadOnlyCollection<string> Languages,
    IReadOnlyCollection<string> MissingProfileSections);

/// <summary>Offre recommandee, avec le detail du matching.</summary>
public record RecommendedJobDto(
    Guid JobId,
    string Title,
    string EmployerName,
    string City,
    string Country,
    string Domain,
    decimal SalaryMin,
    decimal SalaryMax,
    int MatchPercentage,
    IReadOnlyCollection<string> MatchedSkills,
    IReadOnlyCollection<string> MissingSkills,
    DateOnly DisplayUntil);

public record ApplicationStatusCountDto(ApplicationStatus Status, int Count);

public record EmployeeDashboardDto(
    ProfileSummaryDto Profile,
    IReadOnlyCollection<RecommendedJobDto> Recommendations,
    int SubmittedApplications,
    int ViewedOffers,
    int ResumeCount,
    IReadOnlyCollection<ApplicationStatusCountDto> ApplicationsByStatus,
    IReadOnlyCollection<MyApplicationDto> RecentApplications);

/// <summary>Ligne de pilotage d'une offre dans le cockpit employeur.</summary>
public record EmployerOfferStatDto(
    Guid JobId,
    string Title,
    string City,
    JobStatus Status,
    DateOnly DisplayUntil,
    int ViewCount,
    int ApplicationCount,
    int NewApplicationCount,
    int BestMatchPercentage);

public record EmployerDashboardDto(
    Guid EmployerId,
    string CompanyName,
    IReadOnlyCollection<string> Sectors,
    int TotalOffers,
    int ActiveOffers,
    int DraftOffers,
    int ClosedOffers,
    int TotalApplications,
    int NewApplications,
    int TotalViews,
    IReadOnlyCollection<ApplicationStatusCountDto> ApplicationsByStatus,
    IReadOnlyCollection<EmployerOfferStatDto> Offers);

public record AdminUserDto(
    Guid Id,
    UserRole Role,
    string DisplayName,
    string Email,
    string Phone,
    string City,
    string Country,
    bool EmailVerified,
    bool IsActive,
    DateTime CreatedAtUtc,
    int RelatedOffers,
    int RelatedApplications);

public record AdminDashboardDto(
    int EmployeeCount,
    int EmployerCount,
    int AdminCount,
    int JobCount,
    int PublishedJobCount,
    int ExternalJobCount,
    int ApplicationCount,
    int ViewCount);

/// <summary>Listes de reference alimentant les listes deroulantes du frontend.</summary>
public record ReferenceDataDto(
    IReadOnlyCollection<string> Domains,
    IReadOnlyCollection<string> Sectors,
    IReadOnlyCollection<string> Cities,
    IReadOnlyCollection<string> Countries,
    IReadOnlyCollection<string> Diplomas,
    IReadOnlyCollection<string> Languages,
    IReadOnlyCollection<string> Skills,
    IReadOnlyCollection<EnumOptionDto> LanguageLevels,
    IReadOnlyCollection<EnumOptionDto> ContractTypes,
    IReadOnlyCollection<EnumOptionDto> WorkModes,
    IReadOnlyCollection<EnumOptionDto> JobStatuses,
    IReadOnlyCollection<EnumOptionDto> ApplicationStatuses);

public record EnumOptionDto(int Value, string Name, string Label);
