namespace Betting.Domain.Entities;
public class Event {
    public Guid EventId { get; set; }
    public Guid CompetitionId { get; set; }
    public string HomeTeam { get; set; } = default!;
    public string AwayTeam { get; set; } = default!;
    public DateTime StartTimeUtc { get; set; }
    public string Status { get; set; } = "Open"; // Open, Suspended, Closed, Settled
    public byte[] RowVersion { get; set; } = default!;
}