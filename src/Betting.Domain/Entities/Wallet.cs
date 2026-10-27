namespace Betting.Domain.Entities;
public class Wallet {
    public Guid WalletId { get; set; }
    public Guid UserId { get; set; }
    public string CurrencyCode { get; set; } = "NGN";
    public string Status { get; set; } = "Active";
    public byte[] RowVersion { get; set; } = default!;
}
public class WalletLedgerEntry {
    public Guid LedgerEntryId { get; set; }
    public Guid WalletId { get; set; }
    public string EntryType { get; set; } = default!; // Debit_Bet, Credit_Win, Credit_Void
    public decimal Amount { get; set; } // Negative for debit
    public string ReferenceType { get; set; } = default!;
    public Guid ReferenceId { get; set; }
    public string IdempotencyKey { get; set; } = default!;
    public DateTime CreatedAtUtc { get; set; }
}