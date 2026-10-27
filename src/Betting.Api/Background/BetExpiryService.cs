using Betting.Infrastructure.Persistence;
using Dapper;
using Microsoft.Extensions.Hosting;

namespace Betting.Api.Background;

public class BetExpiryService : BackgroundService
{
    private readonly IServiceProvider _sp;
    private readonly ILogger<BetExpiryService> _log;
    public BetExpiryService(IServiceProvider sp, ILogger<BetExpiryService> log) { _sp = sp; _log = log; }

    protected override async Task ExecuteAsync(CancellationToken ct)
    {
        while (!ct.IsCancellationRequested)
        {
            try
            {
                using var scope = _sp.CreateScope();
                var factory = scope.ServiceProvider.GetRequiredService<SqlConnectionFactory>();
                using var conn = factory.Create();

                // 1. Close events past start time
                await conn.ExecuteAsync(@"
                    UPDATE dbo.Events SET Status='Closed' 
                    WHERE Status='Open' AND StartTimeUtc < SYSUTCDATETIME()");

                // 2. Void pending bets for closed events (refund stake)
                var pending = await conn.QueryAsync<Guid>(@"
                    SELECT b.BetId FROM dbo.Bets b
                    JOIN dbo.Events e ON e.EventId = b.EventId
                    WHERE b.Status='Pending' AND e.Status='Closed'");

                foreach (var betId in pending)
                {
                    try
                    {
                        await conn.ExecuteAsync("dbo.usp_Settlement_SettleBet",
                            new { BetId = betId, Result = "Void" },
                            commandType: System.Data.CommandType.StoredProcedure);
                        _log.LogInformation("Auto-voided bet {BetId}", betId);
                    }
                    catch { /* already settled */ }
                }
            }
            catch (Exception ex) { _log.LogError(ex, "Expiry job failed"); }

            await Task.Delay(TimeSpan.FromSeconds(30), ct);
        }
    }
}