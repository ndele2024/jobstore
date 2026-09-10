using JobStore.Domain.Enums;

namespace JobStore.Domain.Entities;

/// <summary>
/// Compte unique pour les trois roles (employe, employeur, admin).
/// Les proprietes specifiques a un role restent vides pour les autres.
/// </summary>
public class UserAccount
{
    public Guid Id { get; init; } = Guid.NewGuid();
    public UserRole Role { get; init; }

    // Identite - employe / admin
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;

    // Identite - employeur
    public string CompanyName { get; set; } = string.Empty;
    public List<string> Sectors { get; set; } = [];
    public string WebsiteUrl { get; set; } = string.Empty;

    // Coordonnees communes
    public string Email { get; set; } = string.Empty;
    public string Phone { get; set; } = string.Empty;
    public string AddressLine { get; set; } = string.Empty;
    public string City { get; set; } = string.Empty;
    public string Country { get; set; } = string.Empty;
    public string PostalCode { get; set; } = string.Empty;

    // Securite
    public string PasswordHash { get; set; } = string.Empty;
    public bool EmailVerified { get; set; }
    public bool TwoFactorEnabled { get; set; } = true;
    public bool IsActive { get; set; } = true;

    // Presentation
    public string Headline { get; set; } = string.Empty;
    public string Summary { get; set; } = string.Empty;

    // Profil employe
    public List<string> Skills { get; set; } = [];
    public List<Education> Educations { get; set; } = [];
    public List<Experience> Experiences { get; set; } = [];
    public List<LanguageSkill> Languages { get; set; } = [];
    public List<Certification> Certifications { get; set; } = [];
    public List<ResumeDocument> Resumes { get; set; } = [];

    public DateTime CreatedAtUtc { get; init; } = DateTime.UtcNow;

    /// <summary>Nom affiche selon le role.</summary>
    public string DisplayName => Role == UserRole.Employer
        ? CompanyName
        : $"{FirstName} {LastName}".Trim();
}
