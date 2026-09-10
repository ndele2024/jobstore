using System.Security.Claims;
using JobStore.Application.Abstractions;
using Microsoft.AspNetCore.Mvc;

namespace JobStore.Api.Infrastructure;

/// <summary>
/// Base commune aux controleurs: lecture de l'utilisateur courant depuis le JWT
/// et traduction d'un <see cref="Result"/> en reponse HTTP.
/// </summary>
[ApiController]
[Route("api/[controller]")]
[Produces("application/json")]
public abstract class ApiControllerBase : ControllerBase
{
    /// <summary>Identifiant de l'utilisateur authentifie, ou null si la requete est anonyme.</summary>
    protected Guid? CurrentUserId
    {
        get
        {
            var value = User.FindFirstValue(ClaimTypes.NameIdentifier);
            return Guid.TryParse(value, out var id) ? id : null;
        }
    }

    /// <summary>Identifiant obligatoire: les controleurs concernes sont deja proteges par [Authorize].</summary>
    protected Guid RequiredUserId => CurrentUserId ?? throw new InvalidOperationException("Utilisateur non authentifie.");

    protected IActionResult FromResult<T>(Result<T> result) =>
        result.Success ? Ok(result.Value) : Problem(result);

    protected IActionResult FromResult(Result result) =>
        result.Success ? NoContent() : Problem(result);

    /// <summary>Erreur normalisee: le frontend lit toujours le champ "message".</summary>
    private IActionResult Problem(Result result) =>
        StatusCode(result.StatusCode, new { message = result.Error, statusCode = result.StatusCode });
}
