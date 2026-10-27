
-- Now proc compiles with 0 errors
CREATE   PROC dbo.usp_Bet_Place
  @BetId UNIQUEIDENTIFIER, @UserId UNIQUEIDENTIFIER, @EventId UNIQUEIDENTIFIER,
  @MarketId UNIQUEIDENTIFIER, @SelectionId UNIQUEIDENTIFIER,
  @Stake DECIMAL(18,4), @Odds DECIMAL(18,4), @IdempotencyKey NVARCHAR(100), @CorrelationId NVARCHAR(100)
AS BEGIN
  SET NOCOUNT ON;
  IF EXISTS (SELECT 1 FROM dbo.Bets WHERE IdempotencyKey=@IdempotencyKey)
  BEGIN SELECT b.BetId, b.Stake, b.Status, bs.OddsAtPlacement as OddsSnapshot, b.CreatedAtUtc as PlacedAtUtc FROM dbo.Bets b JOIN dbo.BetSelections bs ON b.BetId=bs.BetId WHERE b.IdempotencyKey=@IdempotencyKey; RETURN; END
  DECLARE @walletId UNIQUEIDENTIFIER = (SELECT WalletId FROM dbo.Wallets WHERE UserId=@UserId);
  DECLARE @bal DECIMAL(18,4) = (SELECT ISNULL(SUM(Amount),0) FROM dbo.WalletLedgerEntries WHERE WalletId=@walletId);
  IF @bal < @Stake THROW 50000, 'Insufficient balance', 1;
  INSERT INTO dbo.Bets(BetId, UserId, EventId, MarketId, SelectionId, Stake, OddsSnapshot, Status, CreatedAtUtc, IdempotencyKey, CorrelationId) VALUES (@BetId, @UserId, @EventId, @MarketId, @SelectionId, @Stake, @Odds, 'Pending', SYSUTCDATETIME(), @IdempotencyKey, @CorrelationId);
  INSERT INTO dbo.BetSelections(BetId, EventId, MarketId, SelectionId, OddsAtPlacement) VALUES (@BetId, @EventId, @MarketId, @SelectionId, @Odds);
  INSERT INTO dbo.WalletLedgerEntries(LedgerEntryId, WalletId, Amount, EntryType, ReferenceId, CreatedAtUtc) VALUES (NEWID(), @walletId, -@Stake, 'Stake', @BetId, SYSUTCDATETIME());
  SELECT b.BetId, b.Stake, b.Status, bs.OddsAtPlacement as OddsSnapshot, b.CreatedAtUtc as PlacedAtUtc FROM dbo.Bets b JOIN dbo.BetSelections bs ON b.BetId=bs.BetId WHERE b.BetId=@BetId;
END

