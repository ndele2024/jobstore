using JobStore.Domain.Enums;

namespace JobStore.Domain.Entities;

/// <summary>Une offre d'emploi publiee par un employeur ou importee d'une source externe.</summary>
public class JobOffer
{
    public Guid Id { get; init; } = Guid.NewGuid();
    public Guid EmployerId { get; set; }
    public string EmployerName { get; set; } = string.Empty;

    public string Title { get; set; } = string.Empty;
    public string Domain { get; set; } = string.Empty;
    public string Sector { get; set; } = string.Empty;
    public string City { get; set; } = string.Empty;
    public string Country { get; set; } = string.Empty;

    public decimal SalaryMin { get; set; }
    public decimal SalaryMax { get; set; }
    public ContractType ContractType { get; set; } = ContractType.FullTime;
    public WorkMode WorkMode { get; set; } = WorkMode.OnSite;

    public DateOnly StartDate { get; set; }
    public DateOnly DisplayUntil { get; set; }

    public string Description { get; set; } = string.Empty;
    public List<string> RequiredSkills { get; set; } = [];
    public List<string> Responsibilities { get; set; } = [];

    public JobStatus Status { get; set; } = JobStatus.Draft;
    public bool IsExternal { get; set; }
    public string ExternalApplyUrl { get; set; } = string.Empty;

    public DateTime CreatedAtUtc { get; init; } = DateTime.UtcNow;
    public DateTime UpdatedAtUtc { get; set; } = DateTime.UtcNow;

    /// <summary>Une offre est visible dans la recherche publique si elle est publiee et non expiree.</summary>
    public bool IsVisible =>
        (Status == JobStatus.Published || Status == JobStatus.External) &&
        DisplayUntil >= DateOnly.FromDateTime(DateTime.UtcNow);
}
