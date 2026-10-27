using System.Text;
using Betting.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using Betting.Api.Background;
var builder = WebApplication.CreateBuilder(args);
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options => {
    options.AddSecurityDefinition("Bearer", new Microsoft.OpenApi.Models.OpenApiSecurityScheme {
        Name = "Authorization",
        Type = Microsoft.OpenApi.Models.SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT",
        In = Microsoft.OpenApi.Models.ParameterLocation.Header,
        Description = "Enter the JWT returned by POST /api/v1/auth/login."
    });
    options.AddSecurityRequirement(new Microsoft.OpenApi.Models.OpenApiSecurityRequirement {
        {
            new Microsoft.OpenApi.Models.OpenApiSecurityScheme {
                Reference = new Microsoft.OpenApi.Models.OpenApiReference {
                    Type = Microsoft.OpenApi.Models.ReferenceType.SecurityScheme,
                    Id = "Bearer"
                }
            },
            Array.Empty<string>()
        }
    });
});
builder.Services.AddCors(o => o.AddPolicy("frontend", p => p.WithOrigins("http://localhost:5173").AllowAnyHeader().AllowAnyMethod().AllowCredentials()));
var connStr = builder.Configuration.GetConnectionString("BettingDb") ?? @"Server=localhost\SQLEXPRESS;Database=BettingPlatformDb;Trusted_Connection=True;TrustServerCertificate=True";
builder.Services.AddSingleton(new SqlConnectionFactory(connStr));
var jwtKey = builder.Configuration["Jwt:SigningKey"] ?? "super-secret-key-for-dev-only-min-32-chars-long!";
var jwtIssuer = builder.Configuration["Jwt:Issuer"] ?? "BettingPlatform";
var jwtAudience = builder.Configuration["Jwt:Audience"] ?? "BettingPlatformClient";
Console.WriteLine($"[JWT] Using {jwtKey.Substring(0,10)}... Conn={connStr}");
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme).AddJwtBearer(o => {
    o.TokenValidationParameters = new TokenValidationParameters {
        ValidateIssuer = true, ValidateAudience = true, ValidateLifetime = true, ValidateIssuerSigningKey = true,
        ValidIssuer = jwtIssuer, ValidAudience = jwtAudience,
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey))
    };
});
builder.Services.AddHostedService<BetExpiryService>();
builder.Services.AddAuthorization();
var app = builder.Build();
app.UseSwagger(); app.UseSwaggerUI();
app.UseCors("frontend");
app.UseAuthentication(); app.UseAuthorization();
app.MapControllers();
app.Run();
