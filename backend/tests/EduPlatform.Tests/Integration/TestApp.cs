using EduPlatform.Infrastructure.Persistence;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace EduPlatform.Tests.Integration;

public class TestApp : WebApplicationFactory<Program>
{
    private readonly string _dbName = $"test-db-{Guid.NewGuid()}";

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Testing");

        builder.ConfigureAppConfiguration((_, cfg) =>
        {
            cfg.AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["Jwt:SigningKey"] = "test-key-must-be-long-enough-32+chars",
                ["Jwt:Issuer"] = "kursy-test",
                ["Jwt:Audience"] = "kursy-test",
                ["Jwt:AccessTokenMinutes"] = "60",
                ["Jwt:RefreshTokenDays"] = "7",
                ["ConnectionStrings:Default"] = "Host=ignored;Database=ignored;Username=ignored;Password=ignored",
            });
        });

        builder.ConfigureServices(services =>
        {
            // Replace AppDbContext na InMemory provider. UseInternalServiceProvider izoluje
            // EF Core providers — bez tego oba providery (Npgsql + InMemory) są wykrywane
            // jednocześnie i EF rzuca InvalidOperationException.
            var toRemove = services
                .Where(d =>
                    d.ServiceType == typeof(DbContextOptions<AppDbContext>) ||
                    d.ServiceType == typeof(DbContextOptions) ||
                    d.ServiceType == typeof(AppDbContext))
                .ToList();
            foreach (var d in toRemove) services.Remove(d);

            var efProvider = new ServiceCollection()
                .AddEntityFrameworkInMemoryDatabase()
                .BuildServiceProvider();

            services.AddDbContext<AppDbContext>(opts =>
                opts.UseInMemoryDatabase(_dbName)
                    .UseInternalServiceProvider(efProvider));
        });
    }
}
