using System.Data;
using Betting.Application.DTOs;
using Betting.Infrastructure.Persistence;
using Betting.Infrastructure.Security;
using Dapper;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;
namespace Betting.Api.Controllers;
[ApiController]
[Route("api/v1/[controller]")]
public class AuthController : ControllerBase
{
    private readonly SqlConnectionFactory _factory;
    private readonly IConfiguration _config;
    public AuthController(SqlConnectionFactory factory, IConfiguration config) { _factory = factory; _config = config; }
    [HttpPost("register")]
    public async Task<IActionResult> Register([FromBody] RegisterRequest req)
    {
        if (req.Password!= req.ConfirmPassword) return BadRequest(new { error = "Passwords do not match" });
        if (req.Password.Length < 8) return BadRequest(new { error = "Password must be at least 8 chars" });
        var userId = Guid.NewGuid(); var walletId = Guid.NewGuid(); var hash = PasswordHasher.Hash(req.Password);
        try
        {
            using var conn = _factory.Create(); await conn.OpenAsync();
            await conn.ExecuteAsync("dbo.usp_User_Register", new { UserId = userId, Email = req.Email.ToLower(), PasswordHash = hash, WalletId = walletId, InitialBalance = 10000m }, commandType: CommandType.StoredProcedure);
            var jwt = new JwtTokenGenerator(_config["Jwt:SigningKey"]?? "super-secret-key-for-dev-only-min-32-chars-long!", _config["Jwt:Issuer"]?? "BettingPlatform", _config["Jwt:Audience"]?? "BettingPlatformClient");
            var token = jwt.Generate(userId, req.Email, "User");
            return CreatedAtAction(nameof(Register), new AuthResponse(userId, req.Email, token, "User", 10000m));
        }
        catch (SqlException ex) when (ex.Message.Contains("already registered")) { return Conflict(new { error = "Email already registered" }); }
    }
    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginRequest req)
    {
        using var conn = _factory.Create(); await conn.OpenAsync();
        var user = await conn.QuerySingleOrDefaultAsync<dynamic>("SELECT UserId, Email, PasswordHash FROM Users WHERE Email = @Email", new { Email = req.Email.ToLower() });
        if (user == null) return Unauthorized(new { error = "Invalid credentials" });
        if (!PasswordHasher.Verify(req.Password, (string)user.PasswordHash)) return Unauthorized(new { error = "Invalid credentials" });
        var balance = await conn.ExecuteScalarAsync<decimal?>(@"SELECT SUM(Amount) FROM WalletLedgerEntries WHERE WalletId = (SELECT WalletId FROM Wallets WHERE UserId = @UserId)", new { UserId = (Guid)user.UserId })?? 0m;
        var role = await conn.ExecuteScalarAsync<string>(@"SELECT TOP 1 r.Name FROM Roles r JOIN UserRoles ur ON r.RoleId = ur.RoleId WHERE ur.UserId = @UserId ORDER BY CASE WHEN r.Name = 'Admin' THEN 0 ELSE 1 END", new { UserId = (Guid)user.UserId })?? "User";
        var jwt = new JwtTokenGenerator(_config["Jwt:SigningKey"]?? "super-secret-key-for-dev-only-min-32-chars-long!", _config["Jwt:Issuer"]?? "BettingPlatform", _config["Jwt:Audience"]?? "BettingPlatformClient");
        var token = jwt.Generate((Guid)user.UserId, (string)user.Email, role);
        return Ok(new AuthResponse((Guid)user.UserId, (string)user.Email, token, role, balance));
    }
}
