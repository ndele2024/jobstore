using JobStore.Api.Infrastructure;
using JobStore.Application.Abstractions;
using JobStore.Application.DTOs;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace JobStore.Api.Controllers;

/// <summary>
/// Inscription, connexion en deux etapes et gestion des identifiants.
///
/// Parcours de connexion:
///   POST /api/auth/login          -> renvoie un challengeId et envoie le code par courriel
///   POST /api/auth/verify         -> renvoie le jeton JWT
/// </summary>
public class AuthController(IAuthService authService) : ApiControllerBase
{
    /// <summary>Cree un compte candidat et declenche l'envoi du code de verification.</summary>
    [HttpPost("register/employee")]
    [AllowAnonymous]
    public IActionResult RegisterEmployee([FromBody] RegisterEmployeeRequest request) =>
        FromResult(authService.RegisterEmployee(request));

    /// <summary>Cree un compte entreprise et declenche l'envoi du code de verification.</summary>
    [HttpPost("register/employer")]
    [AllowAnonymous]
    public IActionResult RegisterEmployer([FromBody] RegisterEmployerRequest request) =>
        FromResult(authService.RegisterEmployer(request));

    /// <summary>Etape 1 de la connexion: valide le mot de passe et envoie le code a 6 chiffres.</summary>
    [HttpPost("login")]
    [AllowAnonymous]
    public IActionResult Login([FromBody] LoginRequest request) =>
        FromResult(authService.Login(request));

    /// <summary>Etape 2: confirme le code et renvoie le jeton JWT.</summary>
    [HttpPost("verify")]
    [AllowAnonymous]
    public IActionResult Verify([FromBody] VerifyCodeRequest request) =>
        FromResult(authService.VerifyCode(request));

    /// <summary>Renvoie un nouveau code pour un defi existant.</summary>
    [HttpPost("resend-code")]
    [AllowAnonymous]
    public IActionResult ResendCode([FromBody] ResendCodeRequest request) =>
        FromResult(authService.ResendCode(request));

    /// <summary>Profil minimal de l'utilisateur connecte (utilise au demarrage du frontend).</summary>
    [HttpGet("me")]
    [Authorize]
    public IActionResult Me() => FromResult(authService.GetCurrentUser(RequiredUserId));

    /// <summary>Demande de changement d'adresse courriel: un code part vers la nouvelle adresse.</summary>
    [HttpPost("change-email")]
    [Authorize]
    public IActionResult ChangeEmail([FromBody] ChangeEmailRequest request) =>
        FromResult(authService.RequestEmailChange(RequiredUserId, request));

    /// <summary>Changement de mot de passe, apres verification du mot de passe actuel.</summary>
    [HttpPost("change-password")]
    [Authorize]
    public IActionResult ChangePassword([FromBody] ChangePasswordRequest request) =>
        FromResult(authService.ChangePassword(RequiredUserId, request));
}
