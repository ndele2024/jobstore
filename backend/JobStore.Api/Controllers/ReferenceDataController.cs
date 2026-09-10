using JobStore.Api.Infrastructure;
using JobStore.Application.Abstractions;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace JobStore.Api.Controllers;

/// <summary>Listes de reference consommees par les formulaires et les filtres du frontend.</summary>
[Route("api/reference-data")]
public class ReferenceDataController(IReferenceDataService referenceDataService) : ApiControllerBase
{
    [HttpGet]
    [AllowAnonymous]
    public IActionResult Get() => Ok(referenceDataService.Get());
}
