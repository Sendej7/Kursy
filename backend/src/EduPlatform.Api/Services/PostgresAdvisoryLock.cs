using Microsoft.EntityFrameworkCore;
using EduPlatform.Infrastructure.Persistence;

namespace EduPlatform.Api.Services;

/// <summary>
/// Postgres advisory lock — koordynacja background jobs między wieloma instancjami backendu.
/// Każdy job ma własny key (int4); pierwsza instancja go pobiera, pozostałe widzą "lock taken".
/// </summary>
public static class PostgresAdvisoryLock
{
    /// <summary>
    /// Próbuje pobrać NIEBLOKUJĄCY lock (pg_try_advisory_lock). Zwraca true gdy uzyskaliśmy.
    /// Lock trzymany do końca connection (czyli scope DbContextu) lub do explicit unlock.
    /// </summary>
    public static async Task<bool> TryAcquireAsync(AppDbContext db, int key, CancellationToken ct = default)
    {
        if (!db.Database.IsRelational())
        {
            // InMemory (testy) — udajemy że lock zawsze pobrany; tick wykona się bez koordynacji.
            return true;
        }

        var conn = db.Database.GetDbConnection();
        if (conn.State != System.Data.ConnectionState.Open)
        {
            await conn.OpenAsync(ct);
        }
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = "SELECT pg_try_advisory_lock(@key)";
        var p = cmd.CreateParameter();
        p.ParameterName = "@key";
        p.Value = key;
        cmd.Parameters.Add(p);
        var result = await cmd.ExecuteScalarAsync(ct);
        return result is bool ok && ok;
    }

    public static async Task ReleaseAsync(AppDbContext db, int key, CancellationToken ct = default)
    {
        if (!db.Database.IsRelational()) return;
        var conn = db.Database.GetDbConnection();
        if (conn.State != System.Data.ConnectionState.Open) return;
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = "SELECT pg_advisory_unlock(@key)";
        var p = cmd.CreateParameter();
        p.ParameterName = "@key";
        p.Value = key;
        cmd.Parameters.Add(p);
        try { await cmd.ExecuteScalarAsync(ct); } catch { /* best-effort */ }
    }

    /// <summary>Konwencja: każdy job ma swój staticznie zarezerwowany numer.</summary>
    public const int DailyGoalReminderKey = 1001;
    public const int StreakReminderKey = 1002;
    public const int MonthlySettlementKey = 1003;
}
