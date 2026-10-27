namespace Betting.Domain.Entities;
public class Market {
    public Guid MarketId { get; set; }
    public Guid EventId { get; set; }
    public string Name { get; set; } = "Match Winner";
    public string Status { get; set; } = "Open";
    public string SettlementStatus { get; set; } = "Pending";
}