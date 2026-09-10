using JobStore.Application.Abstractions;
using JobStore.Application.DTOs;
using JobStore.Domain.Entities;
using JobStore.Domain.Enums;

namespace JobStore.Infrastructure.Services;

/// <summary>Depot des candidatures et suivi de leur statut.</summary>
public class ApplicationService(IJobStoreRepository repository, IMatchingService matchingService) : IApplicationService
{
    public Result<MyApplicationDto> Submit(Guid employeeId, Guid jobId, SubmitApplicationRequest request)
    {
        return repository.Transaction(() =>
        {
            var employee = repository.FindUser(employeeId);
            if (employee is null || employee.Role != UserRole.Employee)
            {
                return Result<MyApplicationDto>.Forbidden("Seul un compte candidat peut postuler.");
            }

            var job = repository.FindJob(jobId);
            if (job is null || job.Status == JobStatus.Deleted)
            {
                return Result<MyApplicationDto>.NotFound("Offre introuvable.");
            }

            if (job.IsExternal)
            {
                return Result<MyApplicationDto>.Fail(
                    "Cette offre provient d'un partenaire: la candidature se fait sur son site.", 409);
            }

            if (!job.IsVisible)
            {
                return Result<MyApplicationDto>.Fail("Cette offre n'accepte plus de candidature.", 409);
            }

            if (repository.Applications.Any(a => a.JobOfferId == jobId && a.EmployeeId == employeeId))
            {
                return Result<MyApplicationDto>.Fail("Vous avez deja postule a cette offre.", 409);
            }

            var resume = employee.Resumes.FirstOrDefault(r => r.Id == request.ResumeId);
            if (resume is null)
            {
                return Result<MyApplicationDto>.Fail("Selectionnez un CV valide avant de postuler.");
            }

            var (percentage, matched, missing) = matchingService.Evaluate(employee, job);

            var application = new JobApplication
            {
                JobOfferId = jobId,
                EmployeeId = employeeId,
                ResumeId = resume.Id,
                ResumeName = resume.FileName,
                CoverLetter = request.CoverLetter?.Trim() ?? string.Empty,
                CoverLetterFileName = request.CoverLetterFileName?.Trim() ?? string.Empty,
                Status = ApplicationStatus.Submitted,
                MatchPercentage = percentage,
                MatchedSkills = matched,
                MissingSkills = missing
            };

            repository.AddApplication(application);
            return Result<MyApplicationDto>.Ok(Mapper.ToMyApplication(application, job));
        });
    }

    public Result<IReadOnlyCollection<MyApplicationDto>> GetMyApplications(Guid employeeId, ApplicationStatus? status)
    {
        return repository.Transaction(() =>
        {
            var employee = repository.FindUser(employeeId);
            if (employee is null || employee.Role != UserRole.Employee)
            {
                return Result<IReadOnlyCollection<MyApplicationDto>>.Forbidden("Espace reserve aux comptes candidat.");
            }

            var items = repository.Applications
                .Where(a => a.EmployeeId == employeeId)
                .Where(a => status is null || a.Status == status)
                .OrderByDescending(a => a.SubmittedAtUtc)
                .Select(a =>
                {
                    var job = repository.FindJob(a.JobOfferId);
                    return job is null ? null : Mapper.ToMyApplication(a, job);
                })
                .Where(a => a is not null)
                .Select(a => a!)
                .ToArray();

            return Result<IReadOnlyCollection<MyApplicationDto>>.Ok(items);
        });
    }

    public Result<JobApplicantDto> UpdateStatus(Guid employerId, Guid applicationId, UpdateApplicationStatusRequest request)
    {
        return repository.Transaction(() =>
        {
            var application = repository.FindApplication(applicationId);
            if (application is null)
            {
                return Result<JobApplicantDto>.NotFound("Candidature introuvable.");
            }

            var job = repository.FindJob(application.JobOfferId);
            if (job is null || job.EmployerId != employerId)
            {
                return Result<JobApplicantDto>.Forbidden("Cette candidature concerne une autre entreprise.");
            }

            var candidate = repository.FindUser(application.EmployeeId);
            if (candidate is null)
            {
                return Result<JobApplicantDto>.NotFound("Candidat introuvable.");
            }

            application.Status = request.Status;
            application.EmployerNote = request.Note?.Trim() ?? application.EmployerNote;
            application.UpdatedAtUtc = DateTime.UtcNow;

            return Result<JobApplicantDto>.Ok(Mapper.ToApplicant(application, candidate));
        });
    }

    public Result WithdrawApplication(Guid employeeId, Guid applicationId)
    {
        return repository.Transaction(() =>
        {
            var application = repository.FindApplication(applicationId);
            if (application is null || application.EmployeeId != employeeId)
            {
                return Result.NotFound("Candidature introuvable.");
            }

            if (application.Status is ApplicationStatus.Accepted or ApplicationStatus.Rejected)
            {
                return Result.Fail("Une candidature deja traitee ne peut plus etre retiree.", 409);
            }

            repository.RemoveApplication(application);
            return Result.Ok();
        });
    }
}
