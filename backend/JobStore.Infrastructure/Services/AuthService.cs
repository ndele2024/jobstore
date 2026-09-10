using System.Security.Cryptography;
using JobStore.Application.Abstractions;
using JobStore.Application.DTOs;
using JobStore.Domain.Entities;
using JobStore.Domain.Enums;
using Microsoft.Extensions.Options;

namespace JobStore.Infrastructure.Services;

/// <summary>
/// Inscription, connexion a deux facteurs, changement d'email et de mot de passe.
///
/// Toutes les operations sensibles passent par un "defi" (challenge): on cree un
/// <see cref="VerificationCode"/>, on envoie le code par courriel, puis le client
/// confirme via <see cref="VerifyCode"/>.
/// </summary>
public class AuthService(
    IJobStoreRepository repository,
    IPasswordHasher passwordHasher,
    ITokenService tokenService,
    IEmailSender emailSender,
    IOptions<JwtOptions> options) : IAuthService
{
    private readonly JwtOptions _options = options.Value;

    public Result<VerificationChallengeResponse> RegisterEmployee(RegisterEmployeeRequest request)
    {
        return repository.Transaction(() =>
        {
            if (repository.FindUserByEmail(request.Email) is not null)
            {
                return Result<VerificationChallengeResponse>.Fail("Un compte existe deja avec cette adresse courriel.", 409);
            }

            var user = new UserAccount
            {
                Role = UserRole.Employee,
                FirstName = request.FirstName.Trim(),
                LastName = request.LastName.Trim(),
                Email = request.Email.Trim().ToLowerInvariant(),
                Phone = request.Phone.Trim(),
                AddressLine = request.AddressLine.Trim(),
                City = request.City.Trim(),
                Country = request.Country.Trim(),
                PostalCode = request.PostalCode.Trim(),
                PasswordHash = passwordHasher.Hash(request.Password),
                EmailVerified = false
            };

            repository.AddUser(user);
            return Result<VerificationChallengeResponse>.Ok(
                IssueChallenge(user, VerificationPurpose.Registration,
                    "Un code a 6 chiffres a ete envoye a votre adresse courriel pour activer votre compte."));
        });
    }

    public Result<VerificationChallengeResponse> RegisterEmployer(RegisterEmployerRequest request)
    {
        return repository.Transaction(() =>
        {
            if (repository.FindUserByEmail(request.Email) is not null)
            {
                return Result<VerificationChallengeResponse>.Fail("Un compte existe deja avec cette adresse courriel.", 409);
            }

            var user = new UserAccount
            {
                Role = UserRole.Employer,
                CompanyName = request.CompanyName.Trim(),
                Email = request.Email.Trim().ToLowerInvariant(),
                Phone = request.Phone.Trim(),
                AddressLine = request.AddressLine.Trim(),
                City = request.City.Trim(),
                Country = request.Country.Trim(),
                PostalCode = request.PostalCode.Trim(),
                WebsiteUrl = request.WebsiteUrl.Trim(),
                Sectors = request.Sectors.Select(s => s.Trim()).Where(s => s.Length > 0).Distinct().ToList(),
                PasswordHash = passwordHasher.Hash(request.Password),
                EmailVerified = false
            };

            repository.AddUser(user);
            return Result<VerificationChallengeResponse>.Ok(
                IssueChallenge(user, VerificationPurpose.Registration,
                    "Un code a 6 chiffres a ete envoye a votre adresse courriel pour activer votre compte entreprise."));
        });
    }

    public Result<VerificationChallengeResponse> Login(LoginRequest request)
    {
        return repository.Transaction(() =>
        {
            var user = repository.FindUserByEmail(request.Email);

            if (user is null || !passwordHasher.Verify(request.Password, user.PasswordHash))
            {
                return Result<VerificationChallengeResponse>.Fail("Adresse courriel ou mot de passe invalide.", 401);
            }

            if (!user.IsActive)
            {
                return Result<VerificationChallengeResponse>.Forbidden("Ce compte a ete desactive par un administrateur.");
            }

            var purpose = user.EmailVerified ? VerificationPurpose.Login : VerificationPurpose.Registration;
            var message = user.EmailVerified
                ? "Un code de verification a ete envoye a votre adresse courriel."
                : "Votre adresse courriel n'est pas encore confirmee. Un nouveau code vient d'etre envoye.";

            return Result<VerificationChallengeResponse>.Ok(IssueChallenge(user, purpose, message));
        });
    }

    public Result<AuthResponse> VerifyCode(VerifyCodeRequest request)
    {
        return repository.Transaction(() =>
        {
            var challenge = repository.FindVerificationCode(request.ChallengeId);
            if (challenge is null)
            {
                return Result<AuthResponse>.NotFound("Demande de verification introuvable. Recommencez l'operation.");
            }

            if (!challenge.IsUsable)
            {
                return Result<AuthResponse>.Fail("Ce code est expire ou a deja ete utilise. Demandez un nouveau code.", 410);
            }

            if (challenge.Code != request.Code)
            {
                challenge.Attempts++;
                return Result<AuthResponse>.Fail("Code invalide. Verifiez le code recu par courriel.", 401);
            }

            var user = repository.FindUser(challenge.UserId);
            if (user is null)
            {
                return Result<AuthResponse>.NotFound("Compte introuvable.");
            }

            challenge.Consumed = true;

            switch (challenge.Purpose)
            {
                case VerificationPurpose.Registration:
                    user.EmailVerified = true;
                    break;
                case VerificationPurpose.EmailChange:
                    user.Email = challenge.PendingValue;
                    user.EmailVerified = true;
                    break;
                case VerificationPurpose.PasswordReset:
                    user.PasswordHash = challenge.PendingValue;
                    break;
            }

            var (token, expires) = tokenService.CreateToken(user);
            return Result<AuthResponse>.Ok(new AuthResponse(token, expires, Mapper.ToAuthUser(user)));
        });
    }

    public Result<VerificationChallengeResponse> ResendCode(ResendCodeRequest request)
    {
        return repository.Transaction(() =>
        {
            var challenge = repository.FindVerificationCode(request.ChallengeId);
            if (challenge is null)
            {
                return Result<VerificationChallengeResponse>.NotFound("Demande de verification introuvable.");
            }

            var user = repository.FindUser(challenge.UserId);
            if (user is null)
            {
                return Result<VerificationChallengeResponse>.NotFound("Compte introuvable.");
            }

            challenge.Consumed = true;
            return Result<VerificationChallengeResponse>.Ok(
                IssueChallenge(user, challenge.Purpose, "Un nouveau code vient d'etre envoye.", challenge.PendingValue));
        });
    }

    public Result<VerificationChallengeResponse> RequestEmailChange(Guid userId, ChangeEmailRequest request)
    {
        return repository.Transaction(() =>
        {
            var user = repository.FindUser(userId);
            if (user is null)
            {
                return Result<VerificationChallengeResponse>.NotFound("Compte introuvable.");
            }

            if (!passwordHasher.Verify(request.CurrentPassword, user.PasswordHash))
            {
                return Result<VerificationChallengeResponse>.Fail("Mot de passe actuel incorrect.", 401);
            }

            var newEmail = request.NewEmail.Trim().ToLowerInvariant();
            if (repository.FindUserByEmail(newEmail) is not null)
            {
                return Result<VerificationChallengeResponse>.Fail("Cette adresse courriel est deja utilisee.", 409);
            }

            return Result<VerificationChallengeResponse>.Ok(
                IssueChallenge(user, VerificationPurpose.EmailChange,
                    "Un code a ete envoye a la nouvelle adresse. Confirmez-le pour finaliser le changement.",
                    newEmail,
                    newEmail));
        });
    }

    public Result ChangePassword(Guid userId, ChangePasswordRequest request)
    {
        return repository.Transaction(() =>
        {
            var user = repository.FindUser(userId);
            if (user is null)
            {
                return Result.NotFound("Compte introuvable.");
            }

            if (!passwordHasher.Verify(request.CurrentPassword, user.PasswordHash))
            {
                return Result.Fail("Mot de passe actuel incorrect.", 401);
            }

            user.PasswordHash = passwordHasher.Hash(request.NewPassword);
            return Result.Ok();
        });
    }

    public Result<AuthUserDto> GetCurrentUser(Guid userId)
    {
        var user = repository.FindUser(userId);
        return user is null
            ? Result<AuthUserDto>.NotFound("Compte introuvable.")
            : Result<AuthUserDto>.Ok(Mapper.ToAuthUser(user));
    }

    /// <summary>Cree un code, le persiste et declenche l'envoi du courriel.</summary>
    private VerificationChallengeResponse IssueChallenge(
        UserAccount user,
        VerificationPurpose purpose,
        string message,
        string pendingValue = "",
        string? targetEmail = null)
    {
        var code = string.IsNullOrWhiteSpace(_options.DemoVerificationCode)
            ? RandomNumberGenerator.GetInt32(0, 1_000_000).ToString("D6")
            : _options.DemoVerificationCode;

        var email = targetEmail ?? user.Email;

        var challenge = new VerificationCode
        {
            UserId = user.Id,
            Email = email,
            Code = code,
            Purpose = purpose,
            PendingValue = pendingValue,
            ExpiresAtUtc = DateTime.UtcNow.AddMinutes(_options.VerificationCodeLifetimeMinutes)
        };

        repository.AddVerificationCode(challenge);
        emailSender.SendVerificationCode(email, code, purpose);

        return new VerificationChallengeResponse(
            challenge.Id,
            email,
            challenge.ExpiresAtUtc,
            _options.ExposeVerificationCode ? code : null,
            message);
    }
}
