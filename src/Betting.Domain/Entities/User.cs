namespace Betting.Domain.Entities;
public class User {
    public Guid UserId { get; set; }
    public string Email { get; set; } = default!;
    public string PasswordHash { get; set; } = default!;
    public string Status { get; set; } = "Active";
    public DateTime CreatedAtUtc { get; set; }
    public byte[] RowVersion { get; set; } = default!;
}