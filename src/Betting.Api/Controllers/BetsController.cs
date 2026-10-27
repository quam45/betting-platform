using System.Data;
using System.IdentityModel.Tokens.Jwt;
using Betting.Application.DTOs;
using Betting.Infrastructure.Persistence;
using Dapper;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Betting.Api.Controllers;

[ApiController]
[Route("api/v1/[controller]")]
[Authorize]
public class BetsController : ControllerBase
{
    private readonly SqlConnectionFactory _factory;
    public BetsController(SqlConnectionFactory f) => _factory = f;
    private Guid GetUserId() => Guid.Parse(User.FindFirst("userId")?.Value?? User.FindFirst(JwtRegisteredClaimNames.Sub)?.Value?? throw new UnauthorizedAccessException());

    [HttpPost]
    public async Task<IActionResult> Place([FromBody] PlaceBetRequest req)
    {
        var userId = GetUserId();
        var correlationId = HttpContext.Request.Headers["X-Correlation-ID"].FirstOrDefault()?? Guid.NewGuid().ToString();
        var betId = Guid.NewGuid();
        if (req.Stake <= 0) return BadRequest(new { error = "Stake must be > 0" });
        // Idempotency-Key header (preferred) or legacy body field; replays return the original bet without charging twice
        var idempotencyKey = Request.Headers["Idempotency-Key"].FirstOrDefault() ?? req.IdempotencyKey;
        if (string.IsNullOrWhiteSpace(idempotencyKey)) return BadRequest(new { error = "Idempotency-Key header required" });
        if (idempotencyKey.Length > 100) return BadRequest(new { error = "Idempotency-Key must be at most 100 characters" });
        try
        {
            using var conn = _factory.Create();
            await conn.OpenAsync();
            var result = await conn.QuerySingleAsync<BetResponse>("dbo.usp_Bet_Place",
                new { BetId = betId, UserId = userId, EventId = req.EventId, MarketId = req.MarketId, SelectionId = req.SelectionId, Stake = req.Stake, Odds = req.ExpectedOdds, IdempotencyKey = idempotencyKey, CorrelationId = correlationId },
                commandType: CommandType.StoredProcedure);
            Response.Headers["X-Correlation-ID"] = correlationId;
            return CreatedAtAction(nameof(GetOne), new { betId = result.BetId }, result);
        }
        catch (Microsoft.Data.SqlClient.SqlException ex)
        {
            if (ex.Message.Contains("Insufficient balance")) return BadRequest(new { error = "Insufficient balance", correlationId });
            if (ex.Message.Contains("Selection not available")) return BadRequest(new { error = "Selection not available", correlationId });
            if (ex.Message.Contains("Odds changed")) return Conflict(new { error = "Odds changed", correlationId });
            if (ex.Message.Contains("Idempotency key already used")) return Conflict(new { error = "Idempotency key already used", correlationId });
            return StatusCode(500, new { error = ex.Message, correlationId });
        }
    }

    [HttpGet("{betId}")]
    public async Task<IActionResult> GetOne(Guid betId)
    {
        var userId = GetUserId();
        using var conn = _factory.Create();
        var bet = await conn.QuerySingleOrDefaultAsync("SELECT b.BetId, b.Stake, b.Status, bs.OddsAtPlacement as OddsSnapshot, b.CreatedAtUtc as PlacedAtUtc FROM Bets b JOIN BetSelections bs ON b.BetId = bs.BetId WHERE b.BetId = @Id AND b.UserId = @UserId", new { Id = betId, UserId = userId });
        if (bet == null) return NotFound();
        return Ok(bet);
    }

    [HttpGet]
    public async Task<IActionResult> MyBets([FromQuery] int page = 1, [FromQuery] int pageSize = 20)
    {
        var userId = GetUserId();
        using var conn = _factory.Create();
        var bets = await conn.QueryAsync("SELECT b.BetId, CONCAT(e.HomeTeam, ' vs ', e.AwayTeam) as EventName, s.Name as SelectionName, b.Stake, bs.OddsAtPlacement as OddsSnapshot, b.Status, b.CreatedAtUtc as PlacedAtUtc FROM Bets b JOIN BetSelections bs ON b.BetId = bs.BetId JOIN Events e ON bs.EventId = e.EventId JOIN Selections s ON bs.SelectionId = s.SelectionId WHERE b.UserId = @UserId ORDER BY b.CreatedAtUtc DESC OFFSET @Offset ROWS FETCH NEXT @PageSize ROWS ONLY", new { UserId = userId, Offset = (page-1)*pageSize, PageSize = pageSize });
        return Ok(bets);
    }
}
