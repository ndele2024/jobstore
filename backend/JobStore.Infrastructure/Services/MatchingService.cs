using JobStore.Application.Abstractions;
using JobStore.Domain.Entities;

namespace JobStore.Infrastructure.Services;

/// <summary>
/// Correspondance profil / offre.
///
/// Le score combine trois signaux, ce qui le rend explicable dans l'interface:
///  - 70 % : competences requises couvertes par le profil
///  - 15 % : proximite geographique (meme ville, sinon meme pays)
///  - 15 % : experience et diplomes renseignes
/// </summary>
public class MatchingService : IMatchingService
{
    public (int Percentage, List<string> Matched, List<string> Missing) Evaluate(UserAccount employee, JobOffer job)
    {
        var required = job.RequiredSkills
            .Where(s => !string.IsNullOrWhiteSpace(s))
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToList();

        var profileSkills = employee.Skills
            .Where(s => !string.IsNullOrWhiteSpace(s))
            .ToHashSet(StringComparer.OrdinalIgnoreCase);

        // Les competences citees dans les taches des experiences comptent aussi.
        foreach (var task in employee.Experiences.SelectMany(e => e.Tasks))
        {
            foreach (var skill in required.Where(skill => task.Contains(skill, StringComparison.OrdinalIgnoreCase)))
            {
                profileSkills.Add(skill);
            }
        }

        var matched = required.Where(profileSkills.Contains).ToList();
        var missing = required.Except(matched, StringComparer.OrdinalIgnoreCase).ToList();

        var skillScore = required.Count == 0 ? 1d : (double)matched.Count / required.Count;

        var locationScore = 0d;
        if (!string.IsNullOrWhiteSpace(employee.City) &&
            employee.City.Equals(job.City, StringComparison.OrdinalIgnoreCase))
        {
            locationScore = 1d;
        }
        else if (!string.IsNullOrWhiteSpace(employee.Country) &&
                 employee.Country.Equals(job.Country, StringComparison.OrdinalIgnoreCase))
        {
            locationScore = 0.6d;
        }

        var backgroundScore = 0d;
        if (employee.Experiences.Count > 0) backgroundScore += 0.6d;
        if (employee.Educations.Count > 0) backgroundScore += 0.4d;

        var total = (skillScore * 0.70d) + (locationScore * 0.15d) + (backgroundScore * 0.15d);
        var percentage = (int)Math.Round(Math.Clamp(total, 0d, 1d) * 100, MidpointRounding.AwayFromZero);

        return (percentage, matched, missing);
    }
}
