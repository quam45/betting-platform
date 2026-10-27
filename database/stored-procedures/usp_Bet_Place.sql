-- Places a single bet. Matches the live BettingPlatformDb schema.
-- Idempotent per (UserId, IdempotencyKey): a replay returns the original bet without charging again.
-- Requires: CREATE UNIQUE INDEX UX_Bets_IdempotencyKey ON dbo.Bets(IdempotencyKey) WHERE IdempotencyKey IS NOT NULL;
CREATE OR ALTER PROCEDURE dbo.usp_Bet_Place
    @BetId UNIQUEIDENTIFIER,
    @UserId UNIQUEIDENTIFIER,
    @EventId UNIQUEIDENTIFIER,
    @MarketId UNIQUEIDENTIFIER,
    @SelectionId UNIQUEIDENTIFIER,
    @Stake DECIMAL(18,4),
    @Odds DECIMAL(18,4),
    @IdempotencyKey NVARCHAR(100),
    @CorrelationId NVARCHAR(100) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;
    BEGIN TRANSACTION;

    -- Replay: same key returns the original bet (keys belong to the user who first used them)
    DECLARE @ExistingBetId UNIQUEIDENTIFIER, @ExistingUserId UNIQUEIDENTIFIER;
    SELECT @ExistingBetId = BetId, @ExistingUserId = UserId
    FROM dbo.Bets WITH (UPDLOCK, HOLDLOCK)
    WHERE IdempotencyKey = @IdempotencyKey;

    IF @ExistingBetId IS NOT NULL
    BEGIN
        IF @ExistingUserId <> @UserId THROW 50024, 'Idempotency key already used', 1;
        SELECT b.BetId, b.Stake, b.Status, bs.OddsAtPlacement AS OddsSnapshot, b.CreatedAtUtc AS PlacedAtUtc
        FROM dbo.Bets b JOIN dbo.BetSelections bs ON b.BetId = bs.BetId
        WHERE b.BetId = @ExistingBetId;
        COMMIT;
        RETURN;
    END

    -- Odds come from the server, never the client: the selection must be live and the price unchanged
    DECLARE @CurrentOdds DECIMAL(18,4) = (
        SELECT s.CurrentOdds
        FROM dbo.Selections s
        JOIN dbo.Markets m ON m.MarketId = s.MarketId
        JOIN dbo.Events e ON e.EventId = m.EventId
        WHERE s.SelectionId = @SelectionId AND m.MarketId = @MarketId AND e.EventId = @EventId
          AND s.Status = 'Active' AND m.Status = 'Open' AND e.Status = 'Open');
    IF @CurrentOdds IS NULL THROW 50022, 'Selection not available', 1;
    IF @CurrentOdds <> @Odds THROW 50023, 'Odds changed', 1;

    -- Lock the wallet row so concurrent bets can't both pass the balance check
    DECLARE @WalletId UNIQUEIDENTIFIER = (SELECT WalletId FROM dbo.Wallets WITH (UPDLOCK, HOLDLOCK) WHERE UserId = @UserId);
    IF @WalletId IS NULL THROW 50020, 'Wallet not found', 1;

    DECLARE @Balance DECIMAL(18,4) = (SELECT ISNULL(SUM(Amount), 0) FROM dbo.WalletLedgerEntries WHERE WalletId = @WalletId);
    IF @Balance < @Stake THROW 50021, 'Insufficient balance', 1;

    INSERT INTO dbo.Bets (BetId, UserId, EventId, MarketId, SelectionId, Stake, OddsSnapshot, Status, CreatedAtUtc, IdempotencyKey, CorrelationId)
    VALUES (@BetId, @UserId, @EventId, @MarketId, @SelectionId, @Stake, @CurrentOdds, 'Pending', SYSUTCDATETIME(), @IdempotencyKey, @CorrelationId);

    INSERT INTO dbo.BetSelections (BetId, EventId, MarketId, SelectionId, OddsAtPlacement)
    VALUES (@BetId, @EventId, @MarketId, @SelectionId, @CurrentOdds);

    INSERT INTO dbo.WalletLedgerEntries (LedgerEntryId, WalletId, Amount, EntryType, ReferenceId, CreatedAtUtc)
    VALUES (NEWID(), @WalletId, -@Stake, 'Stake', @BetId, SYSUTCDATETIME());

    SELECT b.BetId, b.Stake, b.Status, bs.OddsAtPlacement AS OddsSnapshot, b.CreatedAtUtc AS PlacedAtUtc
    FROM dbo.Bets b JOIN dbo.BetSelections bs ON b.BetId = bs.BetId
    WHERE b.BetId = @BetId;

    COMMIT;
END
