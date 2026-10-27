namespace Betting.Application.DTOs;
public record SportDto(Guid SportId, string Code, string Name);
public record CreateEventRequest(string SportCode, string Name, DateTime StartsAtUtc, string MarketName, List<CreateSelectionDto> Selections);
public record CreateSelectionDto(string Name, decimal DecimalOdds);
public record EventListDto(Guid EventId, string SportCode, string SportName, string Name, DateTime StartsAtUtc, string Status, List<MarketDto> Markets);
public record MarketDto(Guid MarketId, string Name, string Status, List<SelectionDto> Selections);
public record SelectionDto(Guid SelectionId, string Name, decimal DecimalOdds, string Status);
