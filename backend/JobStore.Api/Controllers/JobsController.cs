using JobStore.Api.Infrastructure;
using JobStore.Application.Abstractions;
using JobStore.Application.DTOs;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace JobStore.Api.Controllers;

/// <summary>Recherche publique d'offres, detail d'une offre et depot de candidature.</summary>
public class JobsController(IJobService jobService, IApplicationService applicationService) : ApiControllerBase
{
    /// <summary>
    /// Recherche paginee. Accessible sans compte;
    /// si l'appelant est connecte en tant que candidat, chaque resultat porte son pourcentage de correspondance.
    /// </summary>
    [HttpGet]
    [AllowAnonymous]
    public ActionResult<JobSearchResponse> Search([FromQuery] JobSearchRequest request) =>
        Ok(jobService.Search(request, CurrentUserId));

    /// <summary>Detail d'une offre. La consultation d'un candidat connecte est enregistree.</summary>
    [HttpGet("{jobId:guid}")]
    [AllowAnonymous]
    public IActionResult Details(Guid jobId) => FromResult(jobService.GetDetails(jobId, CurrentUserId));

    /// <summary>Depot d'une candidature sur l'offre.</summary>
    [HttpPost("{jobId:guid}/apply")]
    [Authorize(Roles = "Employee")]
    public IActionResult Apply(Guid jobId, [FromBody] SubmitApplicationRequest request) =>
        FromResult(applicationService.Submit(RequiredUserId, jobId, request));
}
