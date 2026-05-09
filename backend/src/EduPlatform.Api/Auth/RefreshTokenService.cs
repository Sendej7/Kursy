using System.Security.Cryptography;
using EduPlatform.Domain.Entities;
using EduPlatform.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace EduPlatform.Api.Auth;

public class RefreshTokenService
{
    private readonly AppDbContext _db;
    private readonly JwtOptions _options;

    public RefreshTokenService(AppDbContext db, IOptions<JwtOptions> options)
    {
        _db = db;
        _options = options.Value;
    }

    public async Task<(string Token, RefreshToken Entity)> IssueAsync(Guid userId, string? userAgent, CancellationToken ct = default)
    {
        var raw = GenerateRaw();
        var hash = HashToken(raw);
        var entity = new RefreshToken
        {
            UserId = userId,
            TokenHash = hash,
            ExpiresAt = DateTime.UtcNow.AddDays(_options.RefreshTokenDays),
            UserAgent = userAgent,
        };
        _db.RefreshTokens.Add(entity);
        await _db.SaveChangesAsync(ct);
        return (raw, entity);
    }

    public async Task<RefreshToken?> ValidateAsync(string raw, CancellationToken ct = default)
    {
        var hash = HashToken(raw);
        var token = await _db.RefreshTokens
            .Include(t => t.User)
            .FirstOrDefaultAsync(t => t.TokenHash == hash, ct);
        if (token is null) return null;
        if (token.RevokedAt is not null) return null;
        if (DateTime.UtcNow >= token.ExpiresAt) return null;
        return token;
    }

    public async Task<(string NewRaw, RefreshToken NewEntity)> RotateAsync(RefreshToken oldToken, string? userAgent, CancellationToken ct = default)
    {
        var raw = GenerateRaw();
        var hash = HashToken(raw);
        var newToken = new RefreshToken
        {
            UserId = oldToken.UserId,
            TokenHash = hash,
            ExpiresAt = DateTime.UtcNow.AddDays(_options.RefreshTokenDays),
            UserAgent = userAgent,
        };
        _db.RefreshTokens.Add(newToken);

        oldToken.RevokedAt = DateTime.UtcNow;
        oldToken.ReplacedByTokenId = newToken.Id;

        await _db.SaveChangesAsync(ct);
        return (raw, newToken);
    }

    public async Task RevokeAllForUserAsync(Guid userId, CancellationToken ct = default)
    {
        var active = await _db.RefreshTokens
            .Where(t => t.UserId == userId && t.RevokedAt == null)
            .ToListAsync(ct);
        foreach (var t in active) t.RevokedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync(ct);
    }

    private static string GenerateRaw()
    {
        var bytes = new byte[64];
        RandomNumberGenerator.Fill(bytes);
        return Convert.ToBase64String(bytes).TrimEnd('=').Replace('+', '-').Replace('/', '_');
    }

    private static string HashToken(string raw)
    {
        var bytes = SHA256.HashData(System.Text.Encoding.UTF8.GetBytes(raw));
        return Convert.ToHexString(bytes);
    }
}
