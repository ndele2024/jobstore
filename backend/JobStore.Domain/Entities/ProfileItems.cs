using JobStore.Domain.Enums;

namespace JobStore.Domain.Entities;

/// <summary>Une formation du parcours scolaire d'un employe.</summary>
public class Education
{
    public Guid Id { get; init; } = Guid.NewGuid();
    public string SchoolName { get; set; } = string.Empty;
    public string City { get; set; } = string.Empty;
    public string Country { get; set; } = string.Empty;
    public string DiplomaName { get; set; } = string.Empty;
    public string FieldOfStudy { get; set; } = string.Empty;
    public DateOnly StartDate { get; set; }
    public DateOnly? EndDate { get; set; }
    public bool IsCurrent { get; set; }
    public bool DiplomaObtained { get; set; }
    public DateOnly? ExpectedGraduationDate { get; set; }
    public int? AccumulatedCredits { get; set; }
    public decimal? Gpa { get; set; }
}

/// <summary>Une experience professionnelle d'un employe.</summary>
public class Experience
{
    public Guid Id { get; init; } = Guid.NewGuid();
    public string JobTitle { get; set; } = string.Empty;
    public string CompanyName { get; set; } = string.Empty;
    public string City { get; set; } = string.Empty;
    public string Country { get; set; } = string.Empty;
    public DateOnly StartDate { get; set; }
    public DateOnly? EndDate { get; set; }
    public bool IsCurrent { get; set; }
    public List<string> Tasks { get; set; } = [];
}

/// <summary>Une langue et son niveau d'aptitude.</summary>
public class LanguageSkill
{
    public Guid Id { get; init; } = Guid.NewGuid();
    public string Name { get; set; } = string.Empty;
    public LanguageLevel Level { get; set; }
}

/// <summary>Une certification professionnelle.</summary>
public class Certification
{
    public Guid Id { get; init; } = Guid.NewGuid();
    public string Name { get; set; } = string.Empty;
    public string Issuer { get; set; } = string.Empty;
    public DateOnly? IssueDate { get; set; }
    public DateOnly? ExpirationDate { get; set; }
    public string CredentialId { get; set; } = string.Empty;
}

/// <summary>Un CV televerse. Le contenu binaire reste en memoire dans ce prototype.</summary>
public class ResumeDocument
{
    public Guid Id { get; init; } = Guid.NewGuid();
    public string FileName { get; set; } = string.Empty;
    public string ContentType { get; set; } = string.Empty;
    public long SizeInBytes { get; set; }
    public byte[] Content { get; set; } = [];
    public bool IsDefault { get; set; }
    public DateTime UploadedAtUtc { get; init; } = DateTime.UtcNow;
}
