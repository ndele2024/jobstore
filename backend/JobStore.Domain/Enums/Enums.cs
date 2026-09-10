namespace JobStore.Domain.Enums;

/// <summary>Type de compte JobStore.</summary>
public enum UserRole
{
    Employee = 1,
    Employer = 2,
    Admin = 3
}

/// <summary>Cycle de vie d'une offre d'emploi.</summary>
public enum JobStatus
{
    Draft = 1,
    Published = 2,
    Closed = 3,
    Deleted = 4,
    External = 5
}

/// <summary>Cycle de vie d'une candidature.</summary>
public enum ApplicationStatus
{
    Submitted = 1,
    InReview = 2,
    Shortlisted = 3,
    Rejected = 4,
    Accepted = 5
}

/// <summary>Niveau d'aptitude linguistique.</summary>
public enum LanguageLevel
{
    Beginner = 1,
    Intermediate = 2,
    Advanced = 3,
    Fluent = 4,
    Native = 5
}

/// <summary>Raison pour laquelle un code a 6 chiffres a ete emis.</summary>
public enum VerificationPurpose
{
    Registration = 1,
    Login = 2,
    EmailChange = 3,
    PasswordReset = 4
}

/// <summary>Type de contrat propose par l'employeur.</summary>
public enum ContractType
{
    FullTime = 1,
    PartTime = 2,
    Contract = 3,
    Internship = 4,
    Freelance = 5
}

/// <summary>Mode de travail.</summary>
public enum WorkMode
{
    OnSite = 1,
    Hybrid = 2,
    Remote = 3
}
