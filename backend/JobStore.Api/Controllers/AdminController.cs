using JobStore.Api.Infrastructure;
using JobStore.Application.Abstractions;
using JobStore.Domain.Enums;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace JobStore.Api.Controllers;

/// <summary>Administration: vue d'ensemble de la plateforme et gestion des comptes.</summary>
[Authorize(Roles = "Admin")]
public class AdminController(IDashboardService dashboardService) : ApiControllerBase
{
    [HttpGet("dashboard")]
    public IActionResult Dashboard() => Ok(dashboardService.GetAdminDashboard());

    [HttpGet("users/employees")]
    public IActionResult Employees() => Ok(dashboardService.GetUsersByRole(UserRole.Employee));

    [HttpGet("users/employers")]
    public IActionResult Employers() => Ok(dashboardService.GetUsersByRole(UserRole.Employer));

    [HttpGet("users/admins")]
    public IActionResult Admins() => Ok(dashboardService.GetUsersByRole(UserRole.Admin));

    /// <summary>Active ou desactive un compte candidat ou entreprise.</summary>
    [HttpPatch("users/{userId:guid}/activation")]
    public IActionResult ToggleActivation(Guid userId, [FromQuery] bool isActive) =>
        FromResult(dashboardService.ToggleUserActivation(userId, isActive));
}
