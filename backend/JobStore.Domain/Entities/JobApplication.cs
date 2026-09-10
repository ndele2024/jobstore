using JobStore.Domain.Enums;

namespace JobStore.Domain.Entities;

/// <summary>Candidature d'un employe sur une offre.</summary>
public class JobApplication
{
    public Guid Id { get; init; } = Guid.NewGuid();
    public Guid JobOfferId { get; init; }
    public Guid EmployeeId { get; init; }
    public Guid? ResumeId { get; set; }
    public string ResumeName { get; set; } = string.Empty;
    public string CoverLetter { get; set; } = string.Empty;
    public string CoverLetterFileName { get; set; } = string.Empty;
    public ApplicationStatus Status { get; set; } = ApplicationStatus.Submitted;
    public int MatchPercentage { get; set; }
    public List<string> MatchedSkills { get; set; } = [];
    public List<string> MissingSkills { get; set; } = [];
    public string EmployerNote { get; set; } = string.Empty;
    public DateTime SubmittedAtUtc { get; init; } = DateTime.UtcNow;
    public DateTime UpdatedAtUtc { get; set; } = DateTime.UtcNow;
}
