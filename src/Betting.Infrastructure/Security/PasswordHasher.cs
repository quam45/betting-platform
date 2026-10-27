using System.Security.Cryptography;
using Microsoft.AspNetCore.Cryptography.KeyDerivation;
namespace Betting.Infrastructure.Security;
public class PasswordHasher
{
    public static string Hash(string password)
    {
        byte[] salt = RandomNumberGenerator.GetBytes(128 / 8);
        string hashed = Convert.ToBase64String(KeyDerivation.Pbkdf2(password, salt, KeyDerivationPrf.HMACSHA256, 100000, 256 / 8));
        return $"{Convert.ToBase64String(salt)}.{hashed}";
    }
    public static bool Verify(string password, string storedHash)
    {
        var parts = storedHash.Split('.');
        if (parts.Length!= 2) return false;
        var salt = Convert.FromBase64String(parts[0]);
        var hash = parts[1];
        var computed = Convert.ToBase64String(KeyDerivation.Pbkdf2(password, salt, KeyDerivationPrf.HMACSHA256, 100000, 256 / 8));
        return CryptographicOperations.FixedTimeEquals(System.Text.Encoding.UTF8.GetBytes(hash), System.Text.Encoding.UTF8.GetBytes(computed));
    }
}
