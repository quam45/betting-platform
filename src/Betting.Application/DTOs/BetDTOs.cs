namespace Betting.Application.DTOs;
public record PlaceBetRequest(Guid EventId, Guid MarketId, Guid SelectionId, decimal Stake, decimal ExpectedOdds, string? IdempotencyKey = null);
public record BetResponse(Guid BetId, decimal Stake, string Status, decimal OddsSnapshot, DateTime PlacedAtUtc);
public record BetHistoryDto(Guid BetId, string EventName, string SelectionName, decimal Stake, decimal OddsSnapshot, string Status, DateTime PlacedAtUtc);
