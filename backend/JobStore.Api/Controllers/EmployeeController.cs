using JobStore.Api.Infrastructure;
using JobStore.Application.Abstractions;
using JobStore.Domain.Enums;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace JobStore.Api.Controllers;

/// <summary>Espace candidat: tableau de bord et suivi des candidatures.</summary>
[Authorize(Roles = "Employee")]
public class EmployeeController(
    IDashboardService dashboardService,
    IApplicationService applicationService) : ApiControllerBase
{
    /// <summary>Resume du profil, offres recommandees et compteurs de candidatures.</summary>
    [HttpGet("dashboard")]
    public IActionResult Dashboard() => FromResult(dashboardService.GetEmployeeDashboard(RequiredUserId));

    /// <summary>Candidatures deposees, filtrables par statut.</summary>
    [HttpGet("applications")]
    public IActionResult Applications([FromQuery] ApplicationStatus? status) =>
        FromResult(applicationService.GetMyApplications(RequiredUserId, status));

    /// <summary>Retire une candidature tant qu'elle n'a pas ete tranchee par l'employeur.</summary>
    [HttpDelete("applications/{applicationId:guid}")]
    public IActionResult Withdraw(Guid applicationId) =>
        FromResult(applicationService.WithdrawApplication(RequiredUserId, applicationId));
}
