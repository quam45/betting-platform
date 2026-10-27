using Microsoft.Data.SqlClient;
using Microsoft.Extensions.Configuration;

namespace Betting.Infrastructure.Persistence;

public class SqlConnectionFactory
{
    private readonly string _cs;
    public SqlConnectionFactory(string connectionString)
    {
        _cs = connectionString;
    }
    // For DI with IConfiguration - keep simple
    public SqlConnectionFactory(IConfiguration cfg)
    {
        _cs = cfg.GetConnectionString("BettingDb") 
              ?? cfg["ConnectionStrings:BettingDb"] 
              ?? cfg["ConnectionStrings__BettingDb"]
              ?? throw new InvalidOperationException("Connection string missing: BettingDb");
    }
    public SqlConnection Create() => new SqlConnection(_cs);
}