using System.ComponentModel.DataAnnotations;
using JobStore.Domain.Enums;

namespace JobStore.Application.DTOs;

/// <summary>Inscription d'un chercheur d'emploi.</summary>
public class RegisterEmployeeRequest
{
    [Required, MaxLength(80)] public string FirstName { get; set; } = string.Empty;
    [Required, MaxLength(80)] public string LastName { get; set; } = string.Empty;
    [Required, EmailAddress] public string Email { get; set; } = string.Empty;
    [Required, Phone] public string Phone { get; set; } = string.Empty;
    [MaxLength(160)] public string AddressLine { get; set; } = string.Empty;
    [Required] public string City { get; set; } = string.Empty;
    [Required] public string Country { get; set; } = string.Empty;
    public string PostalCode { get; set; } = string.Empty;
    [Required, MinLength(8)] public string Password { get; set; } = string.Empty;
    [Required, Compare(nameof(Password), ErrorMessage = "La confirmation ne correspond pas au mot de passe.")]
    public string ConfirmPassword { get; set; } = string.Empty;
}

/// <summary>Inscription d'une entreprise.</summary>
public class RegisterEmployerRequest
{
    [Required, MaxLength(120)] public string CompanyName { get; set; } = string.Empty;
    [Required, EmailAddress] public string Email { get; set; } = string.Empty;
    [Required, Phone] public string Phone { get; set; } = string.Empty;
    [MaxLength(160)] public string AddressLine { get; set; } = string.Empty;
    [Required] public string City { get; set; } = string.Empty;
    [Required] public string Country { get; set; } = string.Empty;
    public string PostalCode { get; set; } = string.Empty;
    public string WebsiteUrl { get; set; } = string.Empty;
    [Required, MinLength(1, ErrorMessage = "Selectionnez au moins un secteur d'activite.")]
    public List<string> Sectors { get; set; } = [];
    [Required, MinLength(8)] public string Password { get; set; } = string.Empty;
    [Required, Compare(nameof(Password), ErrorMessage = "La confirmation ne correspond pas au mot de passe.")]
    public string ConfirmPassword { get; set; } = string.Empty;
}

/// <summary>Reponse renvoyee apres une action qui declenche l'envoi d'un code a 6 chiffres.</summary>
/// <param name="ChallengeId">Identifiant du defi a renvoyer lors de la verification.</param>
/// <param name="Email">Adresse destinataire du code (masquee cote UI si besoin).</param>
/// <param name="ExpiresAtUtc">Date d'expiration du code.</param>
/// <param name="DevCode">Code en clair, expose uniquement en mode developpement.</param>
public record VerificationChallengeResponse(
    Guid ChallengeId,
    string Email,
    DateTime ExpiresAtUtc,
    string? DevCode,
    string Message);

/// <summary>Confirmation d'un code a 6 chiffres.</summary>
public class VerifyCodeRequest
{
    [Required] public Guid ChallengeId { get; set; }
    [Required, RegularExpression("^[0-9]{6}$", ErrorMessage = "Le code doit contenir 6 chiffres.")]
    public string Code { get; set; } = string.Empty;
}

/// <summary>Demande de renvoi d'un code.</summary>
public class ResendCodeRequest
{
    [Required] public Guid ChallengeId { get; set; }
}

/// <summary>Premiere etape de connexion.</summary>
public class LoginRequest
{
    [Required, EmailAddress] public string Email { get; set; } = string.Empty;
    [Required] public string Password { get; set; } = string.Empty;
}

/// <summary>Utilisateur connecte, tel qu'expose au frontend.</summary>
public record AuthUserDto(
    Guid Id,
    UserRole Role,
    string DisplayName,
    string Email,
    string FirstName,
    string LastName,
    string CompanyName,
    bool EmailVerified);

/// <summary>Jeton JWT et identite associee.</summary>
public record AuthResponse(
    string AccessToken,
    DateTime ExpiresAtUtc,
    AuthUserDto User);

/// <summary>Changement d'adresse courriel (necessite une confirmation par code).</summary>
public class ChangeEmailRequest
{
    [Required, EmailAddress] public string NewEmail { get; set; } = string.Empty;
    [Required] public string CurrentPassword { get; set; } = string.Empty;
}

/// <summary>Changement de mot de passe.</summary>
public class ChangePasswordRequest
{
    [Required] public string CurrentPassword { get; set; } = string.Empty;
    [Required, MinLength(8)] public string NewPassword { get; set; } = string.Empty;
    [Required, Compare(nameof(NewPassword), ErrorMessage = "La confirmation ne correspond pas au mot de passe.")]
    public string ConfirmPassword { get; set; } = string.Empty;
}
