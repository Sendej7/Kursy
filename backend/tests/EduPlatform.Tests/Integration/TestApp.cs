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
            // Replace AppDbContext with InMemory provider for tests.
            var descriptor = services.Single(d => d.ServiceType == typeof(DbContextOptions<AppDbContext>));
            services.Remove(descriptor);
            services.AddDbContext<AppDbContext>(opts => opts.UseInMemoryDatabase(_dbName));
        });
    }
}
