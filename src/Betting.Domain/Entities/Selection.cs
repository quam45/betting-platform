namespace Betting.Domain.Entities;
public class Selection {
    public Guid SelectionId { get; set; }
    public Guid MarketId { get; set; }
    public string Name { get; set; } = default!;
    public string OutcomeCode { get; set; } = default!; // HOME, DRAW, AWAY
    public decimal CurrentOdds { get; set; } // DECIMAL(19,4) in DB
    public string Status { get; set; } = "Open";
}