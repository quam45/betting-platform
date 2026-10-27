using Betting.Infrastructure.Persistence;
using Dapper;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Betting.Api.Controllers;

[ApiController]
[Route("api/v1/admin/events")]
[Authorize]
public class AdminEventsController : ControllerBase
{
    private readonly SqlConnectionFactory _f;
    public AdminEventsController(SqlConnectionFactory f) => _f = f;

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] dynamic dto)
    {
        using var conn = _f.Create();
        var id = Guid.NewGuid();
        await conn.ExecuteAsync(
            @"INSERT INTO dbo.Events(EventId, HomeTeam, AwayTeam, StartTimeUtc, Status) 
              VALUES (@Id, @Home, @Away, @Start, 'Open')",
            new { Id = id, Home = (string)dto.homeTeam, Away = (string)dto.awayTeam, Start = (DateTime)dto.startTimeUtc });
        return Ok(new { eventId = id });
    }

    [HttpPut("{id}/status")]
    public async Task<IActionResult> SetStatus(Guid id, [FromBody] dynamic dto)
    {
        using var conn = _f.Create();
        await conn.ExecuteAsync("UPDATE dbo.Events SET Status=@Status WHERE EventId=@Id",
            new { Id = id, Status = (string)dto.status });
        await conn.ExecuteAsync(
            "INSERT INTO dbo.AuditLogs(Action, EntityType, EntityId, Details) VALUES ('SET_STATUS','Event',@Id,@Details)",
            new { Id = id.ToString(), Details = $"Status -> {dto.status}" });
        return Ok();
    }
}