CREATE OR ALTER PROCEDURE dbo.usp_User_Register
    @UserId UNIQUEIDENTIFIER,
    @Email NVARCHAR(320),
    @PasswordHash NVARCHAR(512),
    @WalletId UNIQUEIDENTIFIER,
    @InitialBalance DECIMAL(19,4) = 10000.00
AS
BEGIN
    SET NOCOUNT ON; SET XACT_ABORT ON; BEGIN TRANSACTION;
    IF EXISTS (SELECT 1 FROM Users WHERE Email = @Email) BEGIN ROLLBACK; THROW 50010, 'Email already registered', 1; END

    INSERT INTO Users (UserId, Email, PasswordHash, Status) VALUES (@UserId, @Email, @PasswordHash, 'Active');
    
    -- Make sure Roles exist
    IF NOT EXISTS (SELECT 1 FROM Roles WHERE Name='User') INSERT INTO Roles (Name) VALUES ('User'), ('Admin'), ('TradingOperator'), ('SettlementOperator');

    DECLARE @UserRoleId UNIQUEIDENTIFIER = (SELECT RoleId FROM Roles WHERE Name = 'User');
    IF NOT EXISTS (SELECT 1 FROM UserRoles WHERE UserId=@UserId AND RoleId=@UserRoleId)
        INSERT INTO UserRoles (UserId, RoleId) VALUES (@UserId, @UserRoleId);

    INSERT INTO Wallets (WalletId, UserId, CurrencyCode, Status) VALUES (@WalletId, @UserId, 'NGN', 'Active');

    INSERT INTO WalletLedgerEntries (LedgerEntryId, WalletId, EntryType, Amount, ReferenceType, ReferenceId, IdempotencyKey)
    VALUES (NEWID(), @WalletId, 'Credit_SignupBonus_Simulated', @InitialBalance, 'Signup', @UserId, 'SIGNUP_' + CAST(@UserId AS NVARCHAR(50)));

    COMMIT;
END
