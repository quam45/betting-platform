CREATE OR ALTER PROCEDURE dbo.usp_Settlement_SettleBet
    @BetId UNIQUEIDENTIFIER,
    @Outcome NVARCHAR(20), -- Won, Lost, Void
    @PayoutAmount DECIMAL(19,4),
    @StakeReturned DECIMAL(19,4),
    @SettlementKey NVARCHAR(100)
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;
    BEGIN TRANSACTION;

    -- Idempotency: one settlement per key
    IF EXISTS (SELECT 1 FROM SettlementRecords WHERE UniqueSettlementKey = @SettlementKey)
    BEGIN
        SELECT * FROM SettlementRecords WHERE UniqueSettlementKey = @SettlementKey;
        COMMIT;
        RETURN;
    END

    DECLARE @UserId UNIQUEIDENTIFIER, @WalletId UNIQUEIDENTIFIER;
    SELECT @UserId = UserId FROM Bets WHERE BetId = @BetId;
    SELECT @WalletId = WalletId FROM Wallets WHERE UserId = @UserId;

    -- Insert settlement record
    INSERT INTO SettlementRecords (SettlementId, BetId, Outcome, StakeReturned, PayoutAmount, UniqueSettlementKey)
    VALUES (NEWID(), @BetId, @Outcome, @StakeReturned, @PayoutAmount, @SettlementKey);

    -- Update bet status
    UPDATE Bets SET Status = @Outcome WHERE BetId = @BetId;

    -- Ledger credit if Won or Void
    IF @Outcome = 'Won' AND @PayoutAmount > 0
    BEGIN
        INSERT INTO WalletLedgerEntries (LedgerEntryId, WalletId, EntryType, Amount, ReferenceType, ReferenceId, IdempotencyKey)
        VALUES (NEWID(), @WalletId, 'Credit_Win', @PayoutAmount, 'Settlement', @BetId, @SettlementKey);
    END
    ELSE IF @Outcome = 'Void' AND @StakeReturned > 0
    BEGIN
        INSERT INTO WalletLedgerEntries (LedgerEntryId, WalletId, EntryType, Amount, ReferenceType, ReferenceId, IdempotencyKey)
        VALUES (NEWID(), @WalletId, 'Credit_Void', @StakeReturned, 'Settlement', @BetId, @SettlementKey);
    END

    COMMIT;
    SELECT * FROM SettlementRecords WHERE BetId = @BetId;
END