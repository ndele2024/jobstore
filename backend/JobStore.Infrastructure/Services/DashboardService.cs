using JobStore.Application.Abstractions;
using JobStore.Application.DTOs;
using JobStore.Domain.Enums;

namespace JobStore.Infrastructure.Services;

/// <summary>Agregations affichees sur les tableaux de bord candidat, employeur et administrateur.</summary>
public class DashboardService(IJobStoreRepository repository, IMatchingService matchingService) : IDashboardService
{
    public Result<EmployeeDashboardDto> GetEmployeeDashboard(Guid userId)
    {
        return repository.Transaction(() =>
        {
            var user = repository.FindUser(userId);
            if (user is null || user.Role != UserRole.Employee)
            {
                return Result<EmployeeDashboardDto>.Forbidden("Espace reserve aux comptes candidat.");
            }

            var appliedJobIds = repository.Applications
                .Where(a => a.EmployeeId == userId)
                .Select(a => a.JobOfferId)
                .ToHashSet();

            // Les offres deja postulees sortent des recommandations.
            var recommendations = repository.Jobs
                .Where(j => j.IsVisible && !j.IsExternal && !appliedJobIds.Contains(j.Id))
                .Select(job =>
                {
                    var (percentage, matched, missing) = matchingService.Evaluate(user, job);
                    return new RecommendedJobDto(
                        job.Id, job.Title, job.EmployerName, job.City, job.Country, job.Domain,
                        job.SalaryMin, job.SalaryMax, percentage, matched, missing, job.DisplayUntil);
                })
                .OrderByDescending(r => r.MatchPercentage)
                .ThenBy(r => r.DisplayUntil)
                .Take(9)
                .ToArray();

            var myApplications = repository.Applications
                .Where(a => a.EmployeeId == userId)
                .OrderByDescending(a => a.SubmittedAtUtc)
                .ToArray();

            var recent = myApplications
                .Take(5)
                .Select(a =>
                {
                    var job = repository.FindJob(a.JobOfferId);
                    return job is null ? null : Mapper.ToMyApplication(a, job);
                })
                .Where(a => a is not null)
                .Select(a => a!)
                .ToArray();

            var profile = new ProfileSummaryDto(
                user.Id,
                user.DisplayName,
                user.Role,
                user.Headline,
                string.Join(", ", new[] { user.City, user.Country }.Where(v => !string.IsNullOrWhiteSpace(v))),
                user.Email,
                user.Phone,
                Mapper.CompletionPercentage(user),
                user.Skills.ToArray(),
                user.Languages.Select(l => $"{l.Name} - {Mapper.Label(l.Level)}").ToArray(),
                Mapper.MissingSections(user));

            return Result<EmployeeDashboardDto>.Ok(new EmployeeDashboardDto(
                profile,
                recommendations,
                myApplications.Length,
                repository.Views.Where(v => v.UserId == userId).Sum(v => v.ViewCount),
                user.Resumes.Count,
                CountByStatus(myApplications.Select(a => a.Status)),
                recent));
        });
    }

    public Result<EmployerDashboardDto> GetEmployerDashboard(Guid userId)
    {
        return repository.Transaction(() =>
        {
            var user = repository.FindUser(userId);
            if (user is null || user.Role != UserRole.Employer)
            {
                return Result<EmployerDashboardDto>.Forbidden("Espace reserve aux comptes entreprise.");
            }

            var offers = repository.Jobs
                .Where(j => j.EmployerId == userId && j.Status != JobStatus.Deleted)
                .OrderByDescending(j => j.UpdatedAtUtc)
                .ToArray();

            var offerIds = offers.Select(o => o.Id).ToHashSet();
            var applications = repository.Applications.Where(a => offerIds.Contains(a.JobOfferId)).ToArray();

            var offerStats = offers.Select(job =>
            {
                var jobApplications = applications.Where(a => a.JobOfferId == job.Id).ToArray();
                return new EmployerOfferStatDto(
                    job.Id,
                    job.Title,
                    job.City,
                    job.Status,
                    job.DisplayUntil,
                    repository.Views.Where(v => v.JobOfferId == job.Id).Sum(v => v.ViewCount),
                    jobApplications.Length,
                    jobApplications.Count(a => a.Status == ApplicationStatus.Submitted),
                    jobApplications.Length == 0 ? 0 : jobApplications.Max(a => a.MatchPercentage));
            }).ToArray();

            return Result<EmployerDashboardDto>.Ok(new EmployerDashboardDto(
                user.Id,
                user.CompanyName,
                user.Sectors.ToArray(),
                offers.Length,
                offers.Count(o => o.Status == JobStatus.Published),
                offers.Count(o => o.Status == JobStatus.Draft),
                offers.Count(o => o.Status == JobStatus.Closed),
                applications.Length,
                applications.Count(a => a.Status == ApplicationStatus.Submitted),
                offerStats.Sum(o => o.ViewCount),
                CountByStatus(applications.Select(a => a.Status)),
                offerStats));
        });
    }

    public AdminDashboardDto GetAdminDashboard()
    {
        return repository.Transaction(() => new AdminDashboardDto(
            repository.Users.Count(u => u.Role == UserRole.Employee),
            repository.Users.Count(u => u.Role == UserRole.Employer),
            repository.Users.Count(u => u.Role == UserRole.Admin),
            repository.Jobs.Count(j => j.Status != JobStatus.Deleted),
            repository.Jobs.Count(j => j.Status == JobStatus.Published),
            repository.Jobs.Count(j => j.IsExternal),
            repository.Applications.Count,
            repository.Views.Sum(v => v.ViewCount)));
    }

    public IReadOnlyCollection<AdminUserDto> GetUsersByRole(UserRole role)
    {
        return repository.Transaction(() => repository.Users
            .Where(u => u.Role == role)
            .OrderBy(u => u.DisplayName)
            .Select(u => new AdminUserDto(
                u.Id,
                u.Role,
                u.DisplayName,
                u.Email,
                u.Phone,
                u.City,
                u.Country,
                u.EmailVerified,
                u.IsActive,
                u.CreatedAtUtc,
                repository.Jobs.Count(j => j.EmployerId == u.Id && j.Status != JobStatus.Deleted),
                repository.Applications.Count(a => a.EmployeeId == u.Id)))
            .ToArray());
    }

    public Result ToggleUserActivation(Guid userId, bool isActive)
    {
        return repository.Transaction(() =>
        {
            var user = repository.FindUser(userId);
            if (user is null)
            {
                return Result.NotFound("Compte introuvable.");
            }

            if (user.Role == UserRole.Admin)
            {
                return Result.Fail("Un compte administrateur ne peut pas etre desactive depuis cette interface.", 409);
            }

            user.IsActive = isActive;
            return Result.Ok();
        });
    }

    /// <summary>Compte les candidatures par statut, en gardant tous les statuts (meme a zero) pour l'affichage.</summary>
    private static IReadOnlyCollection<ApplicationStatusCountDto> CountByStatus(IEnumerable<ApplicationStatus> statuses)
    {
        var list = statuses.ToArray();
        return Enum.GetValues<ApplicationStatus>()
            .Select(status => new ApplicationStatusCountDto(status, list.Count(s => s == status)))
            .ToArray();
    }
}
