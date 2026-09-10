using JobStore.Application.Abstractions;
using JobStore.Domain.Entities;
using JobStore.Domain.Enums;

namespace JobStore.Infrastructure.Persistence;

/// <summary>
/// Jeu de donnees de demonstration charge au demarrage.
/// Les identifiants sont fixes pour rester stables entre deux redemarrages.
/// </summary>
internal static class DemoDataSeeder
{
    public static readonly Guid AdminId = Guid.Parse("11111111-1111-1111-1111-111111111111");
    public static readonly Guid EmployerId = Guid.Parse("22222222-2222-2222-2222-222222222222");
    public static readonly Guid Employer2Id = Guid.Parse("22222222-2222-2222-2222-222222222223");
    public static readonly Guid EmployeeId = Guid.Parse("33333333-3333-3333-3333-333333333333");
    public static readonly Guid Employee2Id = Guid.Parse("33333333-3333-3333-3333-333333333334");

    public static void Seed(
        IPasswordHasher hasher,
        List<UserAccount> users,
        List<JobOffer> jobs,
        List<JobApplication> applications,
        List<JobView> views)
    {
        var today = DateOnly.FromDateTime(DateTime.UtcNow);

        users.AddRange(BuildUsers(hasher, today));
        jobs.AddRange(BuildJobs(today));
        applications.AddRange(BuildApplications(jobs));
        views.AddRange(BuildViews(jobs));
    }

    private static IEnumerable<UserAccount> BuildUsers(IPasswordHasher hasher, DateOnly today)
    {
        yield return new UserAccount
        {
            Id = AdminId,
            Role = UserRole.Admin,
            FirstName = "Romi",
            LastName = "Ndele",
            Email = "ndele2008@gmail.com",
            Phone = "+1 514 555-0100",
            PasswordHash = hasher.Hash("Admin1234"),
            AddressLine = "1000 rue Sherbrooke",
            City = "Montreal",
            Country = "Canada",
            PostalCode = "H3A 1G4",
            EmailVerified = true,
            TwoFactorEnabled = true,
            Headline = "Administrateur general JobStore",
            Summary = "Supervise les employeurs, les candidats et l'import des offres externes."
        };

        yield return new UserAccount
        {
            Id = EmployerId,
            Role = UserRole.Employer,
            CompanyName = "Nord Talent",
            Email = "rh@nordtalent.ca",
            Phone = "+1 514 555-0001",
            PasswordHash = hasher.Hash("Employer123"),
            AddressLine = "455 boulevard Rene-Levesque",
            City = "Montreal",
            Country = "Canada",
            PostalCode = "H2Z 1Z3",
            WebsiteUrl = "https://nordtalent.ca",
            Sectors = ["Technologie", "Fintech"],
            EmailVerified = true,
            TwoFactorEnabled = true,
            Headline = "Studio produit et ingenierie",
            Summary = "Nous construisons des produits numeriques pour le secteur financier et RH."
        };

        yield return new UserAccount
        {
            Id = Employer2Id,
            Role = UserRole.Employer,
            CompanyName = "Clinique Sante Plus",
            Email = "emploi@santeplus.ca",
            Phone = "+1 418 555-0044",
            PasswordHash = hasher.Hash("Employer123"),
            AddressLine = "12 rue Saint-Jean",
            City = "Quebec",
            Country = "Canada",
            PostalCode = "G1R 1N5",
            WebsiteUrl = "https://santeplus.ca",
            Sectors = ["Sante", "Services"],
            EmailVerified = true,
            TwoFactorEnabled = true,
            Headline = "Reseau de cliniques de proximite",
            Summary = "Une equipe de 180 personnes au service des patients de la region de Quebec."
        };

        yield return new UserAccount
        {
            Id = EmployeeId,
            Role = UserRole.Employee,
            FirstName = "Alicia",
            LastName = "Kouame",
            Email = "alicia@example.com",
            Phone = "+1 438 555-1000",
            PasswordHash = hasher.Hash("Employee123"),
            AddressLine = "78 avenue des Erables",
            City = "Laval",
            Country = "Canada",
            PostalCode = "H7N 3S4",
            EmailVerified = true,
            TwoFactorEnabled = true,
            Headline = "Developpeuse full-stack orientee produit",
            Summary = "Profil hybride qui combine code, experience utilisateur et logique metier.",
            Skills = ["Angular", "ASP.NET", "PostgreSQL", "REST", "UX", "TypeScript"],
            Educations =
            [
                new Education
                {
                    SchoolName = "Universite de Montreal",
                    City = "Montreal",
                    Country = "Canada",
                    DiplomaName = "Baccalaureat",
                    FieldOfStudy = "Informatique",
                    StartDate = new DateOnly(today.Year - 5, 9, 1),
                    EndDate = new DateOnly(today.Year - 2, 5, 30),
                    DiplomaObtained = true,
                    AccumulatedCredits = 90,
                    Gpa = 3.7m
                }
            ],
            Experiences =
            [
                new Experience
                {
                    JobTitle = "Developpeuse full-stack",
                    CompanyName = "Studio Boreal",
                    City = "Montreal",
                    Country = "Canada",
                    StartDate = new DateOnly(today.Year - 2, 6, 1),
                    IsCurrent = true,
                    Tasks =
                    [
                        "Developpement d'API REST en ASP.NET Core",
                        "Refonte de l'interface Angular Material",
                        "Mise en place des tests automatises"
                    ]
                }
            ],
            Languages =
            [
                new LanguageSkill { Name = "Francais", Level = LanguageLevel.Native },
                new LanguageSkill { Name = "Anglais", Level = LanguageLevel.Advanced }
            ],
            Certifications =
            [
                new Certification
                {
                    Name = "Azure Developer Associate",
                    Issuer = "Microsoft",
                    IssueDate = new DateOnly(today.Year - 1, 3, 12),
                    CredentialId = "AZ-204-88213"
                }
            ],
            Resumes =
            [
                new ResumeDocument
                {
                    Id = Guid.Parse("66666666-6666-6666-6666-666666666661"),
                    FileName = "cv-alicia-fullstack.txt",
                    ContentType = "text/plain",
                    IsDefault = true,
                    Content = System.Text.Encoding.UTF8.GetBytes(
                        "Alicia Kouame\nalicia@example.com\n+1 438 555-1000\nLaval, Canada\n\n" +
                        "Competences: Angular, ASP.NET, PostgreSQL, REST, UX, TypeScript"),
                    SizeInBytes = 150
                }
            ]
        };

        yield return new UserAccount
        {
            Id = Employee2Id,
            Role = UserRole.Employee,
            FirstName = "Marc",
            LastName = "Tremblay",
            Email = "marc@example.com",
            Phone = "+1 581 555-2200",
            PasswordHash = hasher.Hash("Employee123"),
            AddressLine = "34 rue du Parc",
            City = "Quebec",
            Country = "Canada",
            PostalCode = "G1K 7P4",
            EmailVerified = true,
            TwoFactorEnabled = true,
            Headline = "Analyste de donnees",
            Summary = "Specialiste des pipelines de donnees et de la visualisation.",
            Skills = ["Python", "SQL", "ETL", "Power BI"],
            Languages =
            [
                new LanguageSkill { Name = "Francais", Level = LanguageLevel.Native },
                new LanguageSkill { Name = "Anglais", Level = LanguageLevel.Intermediate }
            ],
            Resumes =
            [
                new ResumeDocument
                {
                    Id = Guid.Parse("66666666-6666-6666-6666-666666666662"),
                    FileName = "cv-marc-donnees.txt",
                    ContentType = "text/plain",
                    IsDefault = true,
                    Content = System.Text.Encoding.UTF8.GetBytes("Marc Tremblay\nAnalyste de donnees\nPython, SQL, ETL"),
                    SizeInBytes = 60
                }
            ]
        };
    }

    private static IEnumerable<JobOffer> BuildJobs(DateOnly today)
    {
        yield return new JobOffer
        {
            Id = Guid.Parse("44444444-4444-4444-4444-444444444441"),
            EmployerId = EmployerId,
            EmployerName = "Nord Talent",
            Title = "Developpeur Full Stack .NET / Angular",
            Domain = "Technologie",
            Sector = "Logiciel",
            City = "Montreal",
            Country = "Canada",
            SalaryMin = 80000,
            SalaryMax = 105000,
            ContractType = ContractType.FullTime,
            WorkMode = WorkMode.Hybrid,
            StartDate = today.AddDays(30),
            DisplayUntil = today.AddDays(45),
            Description = "Concevoir une plateforme d'emploi complete: API REST en ASP.NET Core, interface Angular Material et moteur de correspondance profil / offre. Vous rejoignez une equipe de six personnes et travaillez en cycles de deux semaines.",
            RequiredSkills = ["ASP.NET", "Angular", "PostgreSQL", "REST"],
            Responsibilities =
            [
                "Concevoir et documenter les endpoints REST",
                "Developper les ecrans Angular Material",
                "Participer aux revues de code"
            ],
            Status = JobStatus.Published
        };

        yield return new JobOffer
        {
            Id = Guid.Parse("44444444-4444-4444-4444-444444444442"),
            EmployerId = EmployerId,
            EmployerName = "Nord Talent",
            Title = "Analyste UX pour plateforme RH",
            Domain = "Design",
            Sector = "Ressources humaines",
            City = "Quebec",
            Country = "Canada",
            SalaryMin = 65000,
            SalaryMax = 85000,
            ContractType = ContractType.FullTime,
            WorkMode = WorkMode.Remote,
            StartDate = today.AddDays(20),
            DisplayUntil = today.AddDays(28),
            Description = "Structurer des parcours candidats et employeurs simples, rapides et rassurants. Vous menez les entretiens utilisateurs, produisez les maquettes et suivez la mise en oeuvre avec les developpeurs.",
            RequiredSkills = ["UX", "Figma", "Recherche utilisateur"],
            Responsibilities =
            [
                "Animer les tests utilisateurs",
                "Produire les maquettes et le design system",
                "Mesurer l'impact des parcours"
            ],
            Status = JobStatus.Published
        };

        yield return new JobOffer
        {
            Id = Guid.Parse("44444444-4444-4444-4444-444444444443"),
            EmployerId = AdminId,
            EmployerName = "TalentHub (source externe)",
            Title = "Ingenieur donnees",
            Domain = "Donnees",
            Sector = "Technologie",
            City = "Toronto",
            Country = "Canada",
            SalaryMin = 95000,
            SalaryMax = 125000,
            ContractType = ContractType.FullTime,
            WorkMode = WorkMode.Remote,
            StartDate = today.AddDays(40),
            DisplayUntil = today.AddDays(55),
            Description = "Offre synchronisee depuis une API partenaire. Les candidatures sont redirigees vers le site d'origine. Vous concevez des pipelines de donnees temps reel et des modeles analytiques.",
            RequiredSkills = ["Python", "ETL", "SQL"],
            Responsibilities = ["Construire les pipelines", "Assurer la qualite des donnees"],
            Status = JobStatus.External,
            IsExternal = true,
            ExternalApplyUrl = "https://external.example.com/jobs/data-engineer"
        };

        yield return new JobOffer
        {
            Id = Guid.Parse("44444444-4444-4444-4444-444444444444"),
            EmployerId = Employer2Id,
            EmployerName = "Clinique Sante Plus",
            Title = "Adjoint administratif - clinique",
            Domain = "Administration",
            Sector = "Sante",
            City = "Quebec",
            Country = "Canada",
            SalaryMin = 45000,
            SalaryMax = 55000,
            ContractType = ContractType.PartTime,
            WorkMode = WorkMode.OnSite,
            StartDate = today.AddDays(14),
            DisplayUntil = today.AddDays(35),
            Description = "Accueillir les patients, gerer les rendez-vous et assurer le suivi administratif des dossiers dans un environnement bienveillant et bien organise.",
            RequiredSkills = ["Service a la clientele", "Bureautique", "Organisation"],
            Responsibilities = ["Gerer l'agenda des praticiens", "Assurer l'accueil des patients"],
            Status = JobStatus.Published
        };

        yield return new JobOffer
        {
            Id = Guid.Parse("44444444-4444-4444-4444-444444444445"),
            EmployerId = EmployerId,
            EmployerName = "Nord Talent",
            Title = "Architecte cloud (brouillon)",
            Domain = "Technologie",
            Sector = "Logiciel",
            City = "Montreal",
            Country = "Canada",
            SalaryMin = 110000,
            SalaryMax = 140000,
            ContractType = ContractType.Contract,
            WorkMode = WorkMode.Hybrid,
            StartDate = today.AddDays(60),
            DisplayUntil = today.AddDays(90),
            Description = "Definir l'architecture cible sur Azure, encadrer la migration des services existants et outiller les equipes de developpement.",
            RequiredSkills = ["Azure", "Terraform", "ASP.NET"],
            Responsibilities = ["Definir l'architecture cible", "Encadrer la migration"],
            Status = JobStatus.Draft
        };
    }

    private static IEnumerable<JobApplication> BuildApplications(List<JobOffer> jobs)
    {
        yield return new JobApplication
        {
            Id = Guid.Parse("55555555-5555-5555-5555-555555555551"),
            JobOfferId = jobs[0].Id,
            EmployeeId = EmployeeId,
            ResumeId = Guid.Parse("66666666-6666-6666-6666-666666666661"),
            ResumeName = "cv-alicia-fullstack.txt",
            CoverLetter = "Je souhaite contribuer a une plateforme RH ambitieuse et je connais deja votre stack technique.",
            Status = ApplicationStatus.InReview,
            MatchPercentage = 100,
            MatchedSkills = ["ASP.NET", "Angular", "PostgreSQL", "REST"],
            MissingSkills = [],
            SubmittedAtUtc = DateTime.UtcNow.AddDays(-2)
        };

        yield return new JobApplication
        {
            Id = Guid.Parse("55555555-5555-5555-5555-555555555552"),
            JobOfferId = jobs[0].Id,
            EmployeeId = Employee2Id,
            ResumeId = Guid.Parse("66666666-6666-6666-6666-666666666662"),
            ResumeName = "cv-marc-donnees.txt",
            CoverLetter = "Interesse par un changement de domaine vers le developpement applicatif.",
            Status = ApplicationStatus.Submitted,
            MatchPercentage = 0,
            MatchedSkills = [],
            MissingSkills = ["ASP.NET", "Angular", "PostgreSQL", "REST"],
            SubmittedAtUtc = DateTime.UtcNow.AddDays(-1)
        };
    }

    private static IEnumerable<JobView> BuildViews(List<JobOffer> jobs)
    {
        yield return new JobView
        {
            JobOfferId = jobs[0].Id,
            UserId = EmployeeId,
            ViewedAtUtc = DateTime.UtcNow.AddHours(-8),
            ViewCount = 3
        };

        yield return new JobView
        {
            JobOfferId = jobs[1].Id,
            UserId = EmployeeId,
            ViewedAtUtc = DateTime.UtcNow.AddHours(-4),
            ViewCount = 1
        };

        yield return new JobView
        {
            JobOfferId = jobs[0].Id,
            UserId = Employee2Id,
            ViewedAtUtc = DateTime.UtcNow.AddHours(-30),
            ViewCount = 2
        };
    }
}
