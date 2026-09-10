using JobStore.Application.Abstractions;
using JobStore.Application.DTOs;
using JobStore.Domain.Entities;
using JobStore.Domain.Enums;

namespace JobStore.Infrastructure.Services;

/// <summary>Recherche publique d'offres et gestion des offres cote employeur.</summary>
public class JobService(IJobStoreRepository repository, IMatchingService matchingService) : IJobService
{
    public JobSearchResponse Search(JobSearchRequest request, Guid? viewerId)
    {
        return repository.Transaction(() =>
        {
            var viewer = viewerId.HasValue ? repository.FindUser(viewerId.Value) : null;
            var query = repository.Jobs.Where(j => j.IsVisible);

            if (!string.IsNullOrWhiteSpace(request.Keyword))
            {
                var keyword = request.Keyword.Trim();
                query = query.Where(j =>
                    j.Title.Contains(keyword, StringComparison.OrdinalIgnoreCase) ||
                    j.Description.Contains(keyword, StringComparison.OrdinalIgnoreCase) ||
                    j.EmployerName.Contains(keyword, StringComparison.OrdinalIgnoreCase) ||
                    j.RequiredSkills.Any(s => s.Contains(keyword, StringComparison.OrdinalIgnoreCase)));
            }

            if (!string.IsNullOrWhiteSpace(request.Domain))
            {
                query = query.Where(j => j.Domain.Contains(request.Domain, StringComparison.OrdinalIgnoreCase));
            }

            if (!string.IsNullOrWhiteSpace(request.City))
            {
                query = query.Where(j => j.City.Contains(request.City, StringComparison.OrdinalIgnoreCase));
            }

            if (!string.IsNullOrWhiteSpace(request.Country))
            {
                query = query.Where(j => j.Country.Contains(request.Country, StringComparison.OrdinalIgnoreCase));
            }

            if (!string.IsNullOrWhiteSpace(request.Sector))
            {
                query = query.Where(j => j.Sector.Contains(request.Sector, StringComparison.OrdinalIgnoreCase));
            }

            if (request.MinimumSalary.HasValue)
            {
                query = query.Where(j => j.SalaryMax >= request.MinimumSalary.Value);
            }

            if (request.ContractType.HasValue)
            {
                query = query.Where(j => j.ContractType == request.ContractType.Value);
            }

            if (request.WorkMode.HasValue)
            {
                query = query.Where(j => j.WorkMode == request.WorkMode.Value);
            }

            var cards = query
                .Select(job => Mapper.ToCard(
                    job,
                    viewer?.Role == UserRole.Employee ? matchingService.Evaluate(viewer, job).Percentage : null))
                .ToList();

            cards = (request.SortBy?.ToLowerInvariant() switch
            {
                "salary" => cards.OrderByDescending(c => c.SalaryMax),
                "match" => cards.OrderByDescending(c => c.MatchPercentage ?? -1),
                "deadline" => cards.OrderBy(c => c.DisplayUntil),
                "title" => cards.OrderBy(c => c.Title),
                _ => cards.OrderByDescending(c => c.CreatedAtUtc)
            }).ToList();

            var page = Math.Max(1, request.Page);
            var pageSize = Math.Clamp(request.PageSize, 1, 100);

            return new JobSearchResponse(
                cards.Skip((page - 1) * pageSize).Take(pageSize).ToArray(),
                cards.Count,
                page,
                pageSize);
        });
    }

    public Result<JobDetailsDto> GetDetails(Guid jobId, Guid? viewerId)
    {
        return repository.Transaction(() =>
        {
            var job = repository.FindJob(jobId);
            if (job is null || job.Status == JobStatus.Deleted)
            {
                return Result<JobDetailsDto>.NotFound("Cette offre n'existe pas ou n'est plus disponible.");
            }

            var viewer = viewerId.HasValue ? repository.FindUser(viewerId.Value) : null;

            // Toute consultation par un candidat connecte est tracee pour les statistiques employeur.
            if (viewer is { Role: UserRole.Employee })
            {
                var existing = repository.FindView(jobId, viewer.Id);
                if (existing is null)
                {
                    repository.AddView(new JobView { JobOfferId = jobId, UserId = viewer.Id });
                }
                else
                {
                    existing.ViewCount++;
                    existing.ViewedAtUtc = DateTime.UtcNow;
                }
            }

            return Result<JobDetailsDto>.Ok(BuildDetails(job, viewer));
        });
    }

    public Result<IReadOnlyCollection<JobCardDto>> GetEmployerJobs(Guid employerId, JobStatus? status)
    {
        return repository.Transaction(() =>
        {
            var employer = repository.FindUser(employerId);
            if (employer is null || employer.Role != UserRole.Employer)
            {
                return Result<IReadOnlyCollection<JobCardDto>>.Forbidden("Espace reserve aux comptes entreprise.");
            }

            var jobs = repository.Jobs
                .Where(j => j.EmployerId == employerId && j.Status != JobStatus.Deleted)
                .Where(j => status is null || j.Status == status)
                .OrderByDescending(j => j.UpdatedAtUtc)
                .Select(j => Mapper.ToCard(j))
                .ToArray();

            return Result<IReadOnlyCollection<JobCardDto>>.Ok(jobs);
        });
    }

    public Result<EmployerJobDetailsDto> GetEmployerJobDetails(Guid employerId, Guid jobId)
    {
        return repository.Transaction(() =>
        {
            var job = repository.FindJob(jobId);
            if (job is null || job.Status == JobStatus.Deleted)
            {
                return Result<EmployerJobDetailsDto>.NotFound("Offre introuvable.");
            }

            if (job.EmployerId != employerId)
            {
                return Result<EmployerJobDetailsDto>.Forbidden("Cette offre appartient a une autre entreprise.");
            }

            var applicants = repository.Applications
                .Where(a => a.JobOfferId == jobId)
                .OrderByDescending(a => a.MatchPercentage)
                .ThenByDescending(a => a.SubmittedAtUtc)
                .Select(a =>
                {
                    var candidate = repository.FindUser(a.EmployeeId);
                    return candidate is null ? null : Mapper.ToApplicant(a, candidate);
                })
                .Where(a => a is not null)
                .Select(a => a!)
                .ToArray();

            var applicantIds = repository.Applications
                .Where(a => a.JobOfferId == jobId)
                .Select(a => a.EmployeeId)
                .ToHashSet();

            var viewers = repository.Views
                .Where(v => v.JobOfferId == jobId)
                .OrderByDescending(v => v.ViewedAtUtc)
                .Select(v =>
                {
                    var user = repository.FindUser(v.UserId);
                    return user is null
                        ? null
                        : new JobViewerDto(
                            user.Id,
                            user.DisplayName,
                            user.City,
                            user.Country,
                            v.ViewCount,
                            applicantIds.Contains(user.Id),
                            v.ViewedAtUtc);
                })
                .Where(v => v is not null)
                .Select(v => v!)
                .ToArray();

            return Result<EmployerJobDetailsDto>.Ok(
                new EmployerJobDetailsDto(BuildDetails(job, null), applicants, viewers));
        });
    }

    public Result<JobDetailsDto> CreateJob(Guid employerId, UpsertJobRequest request)
    {
        return repository.Transaction(() =>
        {
            var employer = repository.FindUser(employerId);
            if (employer is null || employer.Role != UserRole.Employer)
            {
                return Result<JobDetailsDto>.Forbidden("Seul un compte entreprise peut publier une offre.");
            }

            var error = Validate(request);
            if (error is not null) return Result<JobDetailsDto>.Fail(error);

            var job = new JobOffer
            {
                EmployerId = employerId,
                EmployerName = employer.CompanyName
            };

            Apply(job, request);
            repository.AddJob(job);

            return Result<JobDetailsDto>.Ok(BuildDetails(job, null));
        });
    }

    public Result<JobDetailsDto> UpdateJob(Guid employerId, Guid jobId, UpsertJobRequest request)
    {
        return repository.Transaction(() =>
        {
            var check = FindOwnedJob(employerId, jobId);
            if (check.Job is null) return Result<JobDetailsDto>.Fail(check.Error, check.Status);

            var error = Validate(request);
            if (error is not null) return Result<JobDetailsDto>.Fail(error);

            Apply(check.Job, request);
            return Result<JobDetailsDto>.Ok(BuildDetails(check.Job, null));
        });
    }

    public Result<JobDetailsDto> UpdateStatus(Guid employerId, Guid jobId, UpdateJobStatusRequest request)
    {
        return repository.Transaction(() =>
        {
            var check = FindOwnedJob(employerId, jobId);
            if (check.Job is null) return Result<JobDetailsDto>.Fail(check.Error, check.Status);

            if (request.Status == JobStatus.External)
            {
                return Result<JobDetailsDto>.Fail("Le statut Externe est reserve aux offres importees.");
            }

            check.Job.Status = request.Status;
            check.Job.UpdatedAtUtc = DateTime.UtcNow;
            return Result<JobDetailsDto>.Ok(BuildDetails(check.Job, null));
        });
    }

    public Result DeleteJob(Guid employerId, Guid jobId)
    {
        return repository.Transaction(() =>
        {
            var check = FindOwnedJob(employerId, jobId);
            if (check.Job is null) return Result.Fail(check.Error, check.Status);

            // Une offre sans candidature est retiree definitivement,
            // sinon elle est archivee pour conserver l'historique des candidats.
            if (repository.Applications.Any(a => a.JobOfferId == jobId))
            {
                check.Job.Status = JobStatus.Deleted;
                check.Job.UpdatedAtUtc = DateTime.UtcNow;
            }
            else
            {
                repository.RemoveJob(check.Job);
            }

            return Result.Ok();
        });
    }

    // -----------------------------------------------------------------------
    // Helpers
    // -----------------------------------------------------------------------

    private (JobOffer? Job, string Error, int Status) FindOwnedJob(Guid employerId, Guid jobId)
    {
        var job = repository.FindJob(jobId);

        if (job is null || job.Status == JobStatus.Deleted)
        {
            return (null, "Offre introuvable.", 404);
        }

        if (job.EmployerId != employerId)
        {
            return (null, "Cette offre appartient a une autre entreprise.", 403);
        }

        if (job.IsExternal)
        {
            return (null, "Une offre importee ne peut pas etre modifiee ici.", 403);
        }

        return (job, string.Empty, 200);
    }

    private JobDetailsDto BuildDetails(JobOffer job, UserAccount? viewer)
    {
        int? match = null;
        IReadOnlyCollection<string> matched = [];
        IReadOnlyCollection<string> missing = [];
        var hasApplied = false;

        if (viewer is { Role: UserRole.Employee })
        {
            var evaluation = matchingService.Evaluate(viewer, job);
            match = evaluation.Percentage;
            matched = evaluation.Matched;
            missing = evaluation.Missing;
            hasApplied = repository.Applications.Any(a => a.JobOfferId == job.Id && a.EmployeeId == viewer.Id);
        }

        return Mapper.ToDetails(
            job,
            repository.Views.Where(v => v.JobOfferId == job.Id).Sum(v => v.ViewCount),
            repository.Applications.Count(a => a.JobOfferId == job.Id),
            match,
            matched,
            missing,
            hasApplied);
    }

    private static string? Validate(UpsertJobRequest request)
    {
        if (request.SalaryMax < request.SalaryMin)
        {
            return "Le salaire maximum doit etre superieur ou egal au salaire minimum.";
        }

        if (request.DisplayUntil < DateOnly.FromDateTime(DateTime.UtcNow))
        {
            return "La date de fin d'affichage doit etre dans le futur.";
        }

        if (request.Status == JobStatus.External)
        {
            return "Le statut Externe est reserve aux offres importees.";
        }

        return null;
    }

    private static void Apply(JobOffer job, UpsertJobRequest request)
    {
        job.Title = request.Title.Trim();
        job.Domain = request.Domain.Trim();
        job.Sector = request.Sector.Trim();
        job.City = request.City.Trim();
        job.Country = request.Country.Trim();
        job.SalaryMin = request.SalaryMin;
        job.SalaryMax = request.SalaryMax;
        job.ContractType = request.ContractType;
        job.WorkMode = request.WorkMode;
        job.StartDate = request.StartDate;
        job.DisplayUntil = request.DisplayUntil;
        job.Description = request.Description.Trim();
        job.RequiredSkills = request.RequiredSkills.Select(s => s.Trim()).Where(s => s.Length > 0).Distinct().ToList();
        job.Responsibilities = request.Responsibilities.Select(s => s.Trim()).Where(s => s.Length > 0).ToList();
        job.Status = request.Status;
        job.UpdatedAtUtc = DateTime.UtcNow;
    }
}
