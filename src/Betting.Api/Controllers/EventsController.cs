using Betting.Infrastructure.Persistence;
using Dapper;
using Microsoft.AspNetCore.Mvc;
namespace Betting.Api.Controllers;
[ApiController]
[Route("api/v1/[controller]")]
public class EventsController : ControllerBase
{
    private readonly SqlConnectionFactory _factory;
    public EventsController(SqlConnectionFactory f) => _factory = f;

    [HttpGet]
    public async Task<IActionResult> List()
    {
        using var conn = _factory.Create();
        try {
            var events = await conn.QueryAsync(@"
                SELECT e.EventId, e.HomeTeam + ' vs ' + e.AwayTeam as Name, e.HomeTeam, e.AwayTeam, e.StartTimeUtc as StartsAtUtc, e.Status,
                       s.Name as SportName, c.Name as CompetitionName, c.Country,
                       m.MarketId, m.Name as MarketName, m.Status as MarketStatus,
                       sel.SelectionId, sel.Name as SelectionName, sel.CurrentOdds as DecimalOdds, sel.Status as SelectionStatus
                FROM Events e
                JOIN Competitions c ON e.CompetitionId = c.CompetitionId
                JOIN Sports s ON c.SportId = s.SportId
                LEFT JOIN Markets m ON m.EventId = e.EventId
                LEFT JOIN Selections sel ON sel.MarketId = m.MarketId
                ORDER BY e.StartTimeUtc");

            var grouped = events.GroupBy(r => (Guid)r.EventId).Select(g => {
                var first = g.First();
                var markets = g.Where(r => r.MarketId!= null).GroupBy(r => (Guid)r.MarketId).Select(mg => {
                    var mf = mg.First();
                    return new {
                        marketId = mf.MarketId,
                        name = mf.MarketName,
                        status = mf.MarketStatus,
                        selections = mg.Where(r => r.SelectionId!= null).Select(r => new { selectionId = r.SelectionId, name = r.SelectionName, decimalOdds = r.DecimalOdds, status = r.SelectionStatus }).ToList()
                    };
                }).ToList();
                return new { eventId = first.EventId, name = first.Name, homeTeam = first.HomeTeam, awayTeam = first.AwayTeam, sportName = first.SportName, competitionName = first.CompetitionName, country = first.Country, startsAtUtc = first.StartsAtUtc, status = first.Status, markets };
            }).ToList();
            return Ok(grouped);
        } catch (Exception ex) {
            return StatusCode(500, new { error = ex.Message, inner = ex.InnerException?.Message });
        }
    }

    [HttpGet("{eventId}")]
    public async Task<IActionResult> GetOne(Guid eventId)
    {
        using var conn = _factory.Create();
        var ev = await conn.QuerySingleOrDefaultAsync("SELECT EventId, HomeTeam, AwayTeam, StartTimeUtc, Status FROM Events WHERE EventId = @Id", new { Id = eventId });
        if (ev == null) return NotFound();
        var markets = await conn.QueryAsync("SELECT MarketId, Name, Status FROM Markets WHERE EventId = @Id", new { Id = eventId });
        var result = new {
            eventId = ev.EventId,
            name = ev.HomeTeam + " vs " + ev.AwayTeam,
            startsAtUtc = ev.StartTimeUtc,
            status = ev.Status,
            markets = await Task.WhenAll(markets.Select(async m => new {
                marketId = m.MarketId,
                name = m.Name,
                status = m.Status,
                selections = await conn.QueryAsync("SELECT SelectionId, Name, CurrentOdds as DecimalOdds, Status FROM Selections WHERE MarketId = @Mid", new { Mid = m.MarketId })
            }))
        };
        return Ok(result);
    }
}
