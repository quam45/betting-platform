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
public class WalletController : ControllerBase
{
    private readonly SqlConnectionFactory _factory;
    public WalletController(SqlConnectionFactory factory) => _factory = factory;
    private Guid GetUserId() => Guid.Parse(User.FindFirst("userId")?.Value?? User.FindFirst(JwtRegisteredClaimNames.Sub)?.Value?? throw new UnauthorizedAccessException());
    [HttpGet]
    public async Task<IActionResult> GetBalance()
    {
        var userId = GetUserId();
        using var conn = _factory.Create();
        var balance = await conn.ExecuteScalarAsync<decimal?>(@"SELECT SUM(Amount) FROM WalletLedgerEntries WHERE WalletId = (SELECT WalletId FROM Wallets WHERE UserId = @UserId)", new { UserId = userId })?? 0m;
        var wallet = await conn.QuerySingleOrDefaultAsync("SELECT WalletId, CurrencyCode FROM Wallets WHERE UserId = @UserId", new { UserId = userId });
        if (wallet == null) return NotFound();
        return Ok(new WalletResponse(wallet.WalletId, wallet.CurrencyCode, balance));
    }
    [HttpGet("ledger")]
    public async Task<IActionResult> GetLedger([FromQuery] int page = 1, [FromQuery] int pageSize = 20)
    {
        var userId = GetUserId();
        using var conn = _factory.Create();
        var entries = await conn.QueryAsync(@"SELECT LedgerEntryId, EntryType, Amount, ReferenceType, CreatedAtUtc FROM WalletLedgerEntries WHERE WalletId = (SELECT WalletId FROM Wallets WHERE UserId = @UserId) ORDER BY CreatedAtUtc DESC OFFSET @Offset ROWS FETCH NEXT @PageSize ROWS ONLY", new { UserId = userId, PageSize = pageSize, Offset = (page-1)*pageSize });
        return Ok(entries);
    }
}
