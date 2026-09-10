using JobStore.Api.Infrastructure;
using JobStore.Application.Abstractions;
using JobStore.Application.DTOs;
using JobStore.Domain.Enums;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace JobStore.Api.Controllers;

/// <summary>Espace entreprise: profil, offres, candidats et statistiques de consultation.</summary>
[Authorize(Roles = "Employer")]
public class EmployerController(
    IProfileService profileService,
    IJobService jobService,
    IApplicationService applicationService,
    IDashboardService dashboardService) : ApiControllerBase
{
    // ---- Profil entreprise -------------------------------------------------

    [HttpGet("profile")]
    public IActionResult GetProfile() => FromResult(profileService.GetEmployerProfile(RequiredUserId));

    [HttpPut("profile")]
    public IActionResult UpdateProfile([FromBody] UpdateEmployerInfoRequest request) =>
        FromResult(profileService.UpdateEmployerInfo(RequiredUserId, request));

    // ---- Tableau de bord ---------------------------------------------------

    [HttpGet("dashboard")]
    public IActionResult Dashboard() => FromResult(dashboardService.GetEmployerDashboard(RequiredUserId));

    // ---- Offres ------------------------------------------------------------

    /// <summary>Toutes les offres de l'entreprise, y compris brouillons et offres fermees.</summary>
    [HttpGet("jobs")]
    public IActionResult GetJobs([FromQuery] JobStatus? status) =>
        FromResult(jobService.GetEmployerJobs(RequiredUserId, status));

    /// <summary>Detail d'une offre avec la liste des candidats et celle des visiteurs.</summary>
    [HttpGet("jobs/{jobId:guid}")]
    public IActionResult GetJobDetails(Guid jobId) =>
        FromResult(jobService.GetEmployerJobDetails(RequiredUserId, jobId));

    [HttpPost("jobs")]
    public IActionResult CreateJob([FromBody] UpsertJobRequest request) =>
        FromResult(jobService.CreateJob(RequiredUserId, request));

    [HttpPut("jobs/{jobId:guid}")]
    public IActionResult UpdateJob(Guid jobId, [FromBody] UpsertJobRequest request) =>
        FromResult(jobService.UpdateJob(RequiredUserId, jobId, request));

    /// <summary>Publier, fermer ou repasser une offre en brouillon.</summary>
    [HttpPatch("jobs/{jobId:guid}/status")]
    public IActionResult UpdateJobStatus(Guid jobId, [FromBody] UpdateJobStatusRequest request) =>
        FromResult(jobService.UpdateStatus(RequiredUserId, jobId, request));

    [HttpDelete("jobs/{jobId:guid}")]
    public IActionResult DeleteJob(Guid jobId) => FromResult(jobService.DeleteJob(RequiredUserId, jobId));

    // ---- Candidatures ------------------------------------------------------

    /// <summary>Met une candidature en analyse, la refuse, la preselectionne ou l'accepte.</summary>
    [HttpPatch("applications/{applicationId:guid}/status")]
    public IActionResult UpdateApplicationStatus(
        Guid applicationId,
        [FromBody] UpdateApplicationStatusRequest request) =>
        FromResult(applicationService.UpdateStatus(RequiredUserId, applicationId, request));

    /// <summary>Telecharge le CV d'un candidat ayant postule a une des offres de l'entreprise.</summary>
    [HttpGet("candidates/{candidateId:guid}/resumes/{resumeId:guid}")]
    public IActionResult DownloadCandidateResume(Guid candidateId, Guid resumeId)
    {
        var result = profileService.DownloadResume(RequiredUserId, candidateId, resumeId);
        return result.Success
            ? File(result.Value.Content, result.Value.ContentType, result.Value.FileName)
            : StatusCode(result.StatusCode, new { message = result.Error });
    }
}
