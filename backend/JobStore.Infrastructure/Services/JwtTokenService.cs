using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using JobStore.Application.Abstractions;
using JobStore.Domain.Entities;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;

namespace JobStore.Infrastructure.Services;

/// <summary>Options JWT liees a la section "Security" de appsettings.json.</summary>
public class JwtOptions
{
    public const string SectionName = "Security";

    public string JwtIssuer { get; set; } = "JobStore";
    public string JwtAudience { get; set; } = "JobStore.Client";
    public string JwtSigningKey { get; set; } = "jobstore-development-signing-key-please-change-me";
    public int TokenLifetimeMinutes { get; set; } = 480;

    /// <summary>Expose le code de verification dans la reponse HTTP (developpement uniquement).</summary>
    public bool ExposeVerificationCode { get; set; } = true;

    /// <summary>Code fixe utilise en demonstration. Vide = code aleatoire.</summary>
    public string DemoVerificationCode { get; set; } = "123456";

    public int VerificationCodeLifetimeMinutes { get; set; } = 10;
}

/// <summary>Genere les jetons JWT porteurs de l'identifiant et du role.</summary>
public class JwtTokenService(IOptions<JwtOptions> options) : ITokenService
{
    private readonly JwtOptions _options = options.Value;

    public (string Token, DateTime ExpiresAtUtc) CreateToken(UserAccount user)
    {
        var expires = DateTime.UtcNow.AddMinutes(_options.TokenLifetimeMinutes);
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_options.JwtSigningKey));

        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
            new(JwtRegisteredClaimNames.Email, user.Email),
            new(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString()),
            new(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new(ClaimTypes.Name, user.DisplayName),
            new(ClaimTypes.Role, user.Role.ToString())
        };

        var token = new JwtSecurityToken(
            issuer: _options.JwtIssuer,
            audience: _options.JwtAudience,
            claims: claims,
            expires: expires,
            signingCredentials: new SigningCredentials(key, SecurityAlgorithms.HmacSha256));

        return (new JwtSecurityTokenHandler().WriteToken(token), expires);
    }
}
