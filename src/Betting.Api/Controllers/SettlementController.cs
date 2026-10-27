using System.Data;
using Betting.Infrastructure.Persistence;
using Dapper;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;

namespace Betting.Api.Controllers;

[ApiController]
[Route("api/v1/admin/bets")]
[Authorize(Roles = "Admin")]
public class SettlementController : ControllerBase
{
    private readonly SqlConnectionFactory _factory;

    public SettlementController(SqlConnectionFactory factory) => _factory = factory;

    public record SettleRequest(string Result); // Won/Lost/Void

    [HttpPost("{betId:guid}/settle")]
    public async Task<IActionResult> Settle(Guid betId, [FromBody] SettleRequest req, CancellationToken ct)
    {
        if (req.Result is not "Won" and not "Lost" and not "Void")
            return BadRequest(new { error = "Result must be Won, Lost or Void" });

        var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        Guid? settledBy = Guid.TryParse(userId, out var g) ? g : null;

        using var conn = _factory.Create();
        await conn.OpenAsync(ct);

        try
        {
            var result = await conn.QuerySingleOrDefaultAsync<dynamic>(
                "dbo.usp_Settlement_SettleBet",
                new { BetId = betId, Result = req.Result, SettledByUserId = settledBy },
                commandType: CommandType.StoredProcedure
            );

            if (result == null)
                return NotFound(new { error = "Bet not found" });

            // Audit log per guide
            await conn.ExecuteAsync(
                "INSERT INTO dbo.AuditLogs(AuditId, Action, EntityType, EntityId, ActorUserId, Details) VALUES (NEWID(), 'SETTLE', 'Bet', @BetId, @Actor, @Details)",
                new { BetId = betId, Actor = settledBy, Details = $"Settled as {req.Result}, payout {result.PayoutAmount}" }
            );

            return Ok(new
            {
                betId = result.BetId,
                result = result.Result,
                payoutAmount = result.PayoutAmount,
                settledAtUtc = result.SettledAtUtc,
                correlationId = HttpContext.Items["CorrelationId"]
            });
        }
        catch (SqlException ex) when (ex.Message.Contains("already settled"))
        {
            return Conflict(new { error = ex.Message, correlationId = HttpContext.Items["CorrelationId"] });
        }
    }

    // GET for verification per guide
    [HttpGet("{betId:guid}/settlement")]
    public async Task<IActionResult> GetSettlement(Guid betId, CancellationToken ct)
    {
        using var conn = _factory.Create();
        var row = await conn.QuerySingleOrDefaultAsync(
            "SELECT * FROM dbo.BetSettlements WHERE BetId=@BetId", new { BetId = betId });
        return row == null ? NotFound() : Ok(row);
    }
}