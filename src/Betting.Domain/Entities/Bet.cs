namespace Betting.Domain.Entities;
public class Bet {
    public Guid BetId { get; set; }
    public Guid UserId { get; set; }
    public string BetType { get; set; } = "Single";
    public decimal Stake { get; set; }
    public decimal PotentialReturn { get; set; }
    public string Status { get; set; } = "Pending"; // Pending, Won, Lost, Void
    public string IdempotencyKey { get; set; } = default!;
    public string IdempotencyHash { get; set; } = default!;
    public DateTime CreatedAtUtc { get; set; }
}
public class BetSelection {
    public Guid BetSelectionId { get; set; }
    public Guid BetId { get; set; }
    public Guid SelectionId { get; set; }
    public Guid EventId { get; set; }
    public Guid MarketId { get; set; }
    public decimal OddsAtPlacement { get; set; }
}