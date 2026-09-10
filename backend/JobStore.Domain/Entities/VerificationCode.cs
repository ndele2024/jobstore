using JobStore.Domain.Enums;

namespace JobStore.Domain.Entities;

/// <summary>Code a 6 chiffres envoye par courriel (inscription, connexion 2FA, changement d'email).</summary>
public class VerificationCode
{
    public Guid Id { get; init; } = Guid.NewGuid();
    public Guid UserId { get; init; }
    public string Email { get; init; } = string.Empty;
    public string Code { get; init; } = string.Empty;
    public VerificationPurpose Purpose { get; init; }

    /// <summary>Valeur en attente de confirmation (nouvel email ou nouveau mot de passe hashe).</summary>
    public string PendingValue { get; init; } = string.Empty;

    public DateTime ExpiresAtUtc { get; init; }
    public bool Consumed { get; set; }
    public int Attempts { get; set; }

    public bool IsUsable => !Consumed && Attempts < 5 && DateTime.UtcNow <= ExpiresAtUtc;
}
