namespace JobStore.Domain.Entities;

/// <summary>Trace de consultation d'une offre, utilisee pour les statistiques employeur.</summary>
public class JobView
{
    public Guid Id { get; init; } = Guid.NewGuid();
    public Guid JobOfferId { get; init; }
    public Guid UserId { get; init; }
    public DateTime ViewedAtUtc { get; set; } = DateTime.UtcNow;
    public int ViewCount { get; set; } = 1;
}
