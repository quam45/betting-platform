namespace Betting.Application.DTOs;
public record RegisterRequest(string Email, string Password, string ConfirmPassword);
public record LoginRequest(string Email, string Password);
public record AuthResponse(Guid UserId, string Email, string Token, string Role, decimal VirtualBalance);
public record WalletResponse(Guid WalletId, string Currency, decimal Balance);
