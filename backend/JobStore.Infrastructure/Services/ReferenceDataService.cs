using JobStore.Application.Abstractions;
using JobStore.Application.DTOs;
using JobStore.Domain.Enums;

namespace JobStore.Infrastructure.Services;

/// <summary>
/// Listes de reference du frontend (menus deroulants, filtres).
/// Les valeurs statiques sont completees par celles reellement presentes en base.
/// </summary>
public class ReferenceDataService(IJobStoreRepository repository) : IReferenceDataService
{
    private static readonly string[] BaseDomains =
    [
        "Technologie", "Design", "Donnees", "Administration", "Sante", "Education",
        "Finance", "Marketing", "Vente", "Ingenierie", "Logistique", "Restauration", "Construction"
    ];

    private static readonly string[] BaseSectors =
    [
        "Logiciel", "Fintech", "Sante", "Ressources humaines", "Commerce de detail", "Manufacturier",
        "Services", "Public", "Education", "Telecommunications", "Transport", "Energie", "Technologie"
    ];

    private static readonly string[] BaseCountries =
    [
        "Canada", "France", "Belgique", "Suisse", "Etats-Unis", "Senegal", "Cote d'Ivoire", "Cameroun", "Maroc"
    ];

    private static readonly string[] BaseCities =
    [
        "Montreal", "Quebec", "Laval", "Longueuil", "Gatineau", "Sherbrooke", "Trois-Rivieres",
        "Toronto", "Ottawa", "Vancouver", "Calgary", "Paris", "Lyon", "Bruxelles", "Geneve", "Dakar", "Abidjan"
    ];

    private static readonly string[] Diplomas =
    [
        "DEP", "AEC", "DEC", "Certificat universitaire", "Baccalaureat", "Maitrise", "MBA", "Doctorat",
        "Diplome d'ingenieur", "Attestation d'etudes", "Autre"
    ];

    private static readonly string[] Languages =
    [
        "Francais", "Anglais", "Espagnol", "Allemand", "Italien", "Portugais",
        "Arabe", "Mandarin", "Russe", "Creole", "Wolof", "Autre"
    ];

    private static readonly string[] BaseSkills =
    [
        "Angular", "React", "TypeScript", "JavaScript", "C#", "ASP.NET", "Java", "Python", "SQL",
        "PostgreSQL", "REST", "Docker", "Azure", "AWS", "Git", "Agile", "Scrum",
        "UX", "UI", "Figma", "Excel", "Power BI", "ETL", "Gestion de projet",
        "Service a la clientele", "Bureautique", "Communication", "Organisation", "Leadership"
    ];

    public ReferenceDataDto Get()
    {
        return repository.Transaction(() => new ReferenceDataDto(
            Merge(BaseDomains, repository.Jobs.Select(j => j.Domain)),
            Merge(BaseSectors, repository.Jobs.Select(j => j.Sector).Concat(repository.Users.SelectMany(u => u.Sectors))),
            Merge(BaseCities, repository.Jobs.Select(j => j.City).Concat(repository.Users.Select(u => u.City))),
            Merge(BaseCountries, repository.Jobs.Select(j => j.Country).Concat(repository.Users.Select(u => u.Country))),
            Merge(Diplomas, repository.Users.SelectMany(u => u.Educations).Select(e => e.DiplomaName)),
            Merge(Languages, repository.Users.SelectMany(u => u.Languages).Select(l => l.Name)),
            Merge(BaseSkills, repository.Jobs.SelectMany(j => j.RequiredSkills)),
            Options<LanguageLevel>(v => Mapper.Label(v)),
            Options<ContractType>(v => Mapper.Label(v)),
            Options<WorkMode>(v => Mapper.Label(v)),
            Options<JobStatus>(v => Mapper.Label(v)),
            Options<ApplicationStatus>(v => Mapper.Label(v))));
    }

    private static string[] Merge(IEnumerable<string> baseValues, IEnumerable<string> dynamicValues) =>
        baseValues
            .Concat(dynamicValues)
            .Where(v => !string.IsNullOrWhiteSpace(v))
            .Select(v => v.Trim())
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .OrderBy(v => v, StringComparer.CurrentCultureIgnoreCase)
            .ToArray();

    private static EnumOptionDto[] Options<TEnum>(Func<TEnum, string> label) where TEnum : struct, Enum =>
        Enum.GetValues<TEnum>()
            .Select(value => new EnumOptionDto(Convert.ToInt32(value), value.ToString(), label(value)))
            .ToArray();
}
