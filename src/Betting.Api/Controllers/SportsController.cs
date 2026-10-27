using Betting.Application.DTOs;
using Betting.Infrastructure.Persistence;
using Dapper;
using Microsoft.AspNetCore.Mvc;
namespace Betting.Api.Controllers;
[ApiController]
[Route("api/v1/[controller]")]
public class SportsController : ControllerBase
{
    private readonly SqlConnectionFactory _factory;
    public SportsController(SqlConnectionFactory f) => _factory = f;

    [HttpGet]
    public async Task<IActionResult> List()
    {
        using var conn = _factory.Create();
        var sports = await conn.QueryAsync<SportDto>("SELECT SportId, Code, Name FROM Sports WHERE IsActive=1 ORDER BY Name");
        return Ok(sports);
    }
}
