-- 003 Sports Catalogue
CREATE TABLE Sports (
    SportId UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    Code NVARCHAR(20) NOT NULL UNIQUE,
    Name NVARCHAR(100) NOT NULL,
    IsActive BIT NOT NULL DEFAULT 1
);

INSERT INTO Sports (Code, Name) VALUES
('FOOT', 'Football'),
('BASK', 'Basketball'),
('TENN', 'Tennis'),
('BASE', 'Baseball');

-- Add SportId to Events if not exists
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Events') AND name = 'SportId')
BEGIN
    ALTER TABLE Events ADD SportId UNIQUEIDENTIFIER NULL FOREIGN KEY REFERENCES Sports(SportId);
    -- Update existing events to Football
    DECLARE @footId UNIQUEIDENTIFIER = (SELECT SportId FROM Sports WHERE Code='FOOT');
    UPDATE Events SET SportId = @footId WHERE SportId IS NULL;
    ALTER TABLE Events ALTER COLUMN SportId UNIQUEIDENTIFIER NOT NULL;
END

-- Procedure to create full event with market+selections (for TradingOperator)
CREATE OR ALTER PROCEDURE dbo.usp_Event_Create
    @EventId UNIQUEIDENTIFIER,
    @SportId UNIQUEIDENTIFIER,
    @ExternalId NVARCHAR(100),
    @Name NVARCHAR(300),
    @StartsAtUtc DATETIME2,
    @MarketId UNIQUEIDENTIFIER,
    @MarketName NVARCHAR(100)
AS
BEGIN
    SET NOCOUNT ON; SET XACT_ABORT ON; BEGIN TRANSACTION;
    INSERT INTO Events (EventId, SportId, ExternalId, Name, StartsAtUtc, Status)
    VALUES (@EventId, @SportId, @ExternalId, @Name, @StartsAtUtc, 'Open');

    INSERT INTO Markets (MarketId, EventId, Name, Status)
    VALUES (@MarketId, @EventId, @MarketName, 'Open');

    COMMIT;
END
