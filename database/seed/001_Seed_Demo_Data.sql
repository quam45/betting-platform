-- Seed demo data - clearly labelled SIMULATED
DECLARE @FootballId UNIQUEIDENTIFIER = NEWID();
INSERT INTO Sports (SportId, Name) VALUES (@FootballId, 'Football');

DECLARE @PLId UNIQUEIDENTIFIER = NEWID();
INSERT INTO Competitions (CompetitionId, SportId, Name, Country) VALUES (@PLId, @FootballId, 'Premier League (Simulated)', 'England');

DECLARE @Event1 UNIQUEIDENTIFIER = NEWID();
INSERT INTO Events (EventId, CompetitionId, HomeTeam, AwayTeam, StartTimeUtc, Status)
VALUES (@Event1, @PLId, 'Arsenal', 'Chelsea', DATEADD(day, 1, SYSUTCDATETIME()), 'Open');

DECLARE @Market1 UNIQUEIDENTIFIER = NEWID();
INSERT INTO Markets (MarketId, EventId, Name) VALUES (@Market1, @Event1, 'Match Winner');

INSERT INTO Selections (SelectionId, MarketId, Name, OutcomeCode, CurrentOdds) VALUES
(NEWID(), @Market1, 'Arsenal', 'HOME', 2.10),
(NEWID(), @Market1, 'Draw', 'DRAW', 3.40),
(NEWID(), @Market1, 'Chelsea', 'AWAY', 3.00);