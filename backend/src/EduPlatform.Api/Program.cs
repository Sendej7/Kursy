using System.Text;
using System.Threading.RateLimiting;
using EduPlatform.AiService;
using EduPlatform.Api.Auth;
using EduPlatform.Api.Billing;
using EduPlatform.Api.Email;
using EduPlatform.Api.Hubs;
using EduPlatform.Api.Seed;
using EduPlatform.Api.Services;
using EduPlatform.CodeRunner;
using EduPlatform.Infrastructure;
using EduPlatform.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Diagnostics.HealthChecks;
using Microsoft.IdentityModel.Tokens;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers()
    .AddJsonOptions(o =>
    {
        // Enumy serializowane jako stringi — frontend porównuje role po nazwach (np. "Admin").
        o.JsonSerializerOptions.Converters.Add(new System.Text.Json.Serialization.JsonStringEnumConverter());
    });
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
builder.Services.AddSignalR();
builder.Services.AddHttpContextAccessor();

builder.Services.AddInfrastructure(builder.Configuration);
builder.Services.AddAiService(builder.Configuration);
builder.Services.AddSingleton<ICodeRunner, InMemoryCodeRunner>();
builder.Services.AddScoped<ICurrentUser, CurrentUser>();
builder.Services.AddScoped<CertificateService>();
builder.Services.AddScoped<GamificationService>();
builder.Services.AddScoped<NotificationService>();

builder.Services.Configure<StripeOptions>(builder.Configuration.GetSection(StripeOptions.SectionName));
builder.Services.AddScoped<InvoiceService>();
builder.Services.AddScoped<StripeService>();

builder.Services.Configure<JwtOptions>(builder.Configuration.GetSection(JwtOptions.SectionName));
builder.Services.Configure<GoogleAuthOptions>(builder.Configuration.GetSection(GoogleAuthOptions.SectionName));
builder.Services.Configure<GitHubAuthOptions>(builder.Configuration.GetSection(GitHubAuthOptions.SectionName));
builder.Services.AddHttpClient<GitHubAuthService>();
builder.Services.AddSingleton<TotpService>();

builder.Services.Configure<SmtpOptions>(builder.Configuration.GetSection(SmtpOptions.SectionName));
// SMTP w prod, logger fallback w dev (i gdy brak konfiguracji).
{
    var smtpSection = builder.Configuration.GetSection(SmtpOptions.SectionName);
    var smtpHost = smtpSection.GetValue<string>("Host");
    if (!string.IsNullOrEmpty(smtpHost))
    {
        builder.Services.AddScoped<IEmailSender, SmtpEmailSender>();
    }
    else
    {
        builder.Services.AddScoped<IEmailSender, LoggingEmailSender>();
    }
}
builder.Services.AddSingleton<JwtTokenService>();
builder.Services.AddScoped<RefreshTokenService>();

var jwtOptions = builder.Configuration.GetSection(JwtOptions.SectionName).Get<JwtOptions>() ?? new JwtOptions();

builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = jwtOptions.Issuer,
            ValidAudience = jwtOptions.Audience,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtOptions.SigningKey)),
            ClockSkew = TimeSpan.FromMinutes(1),
        };
        // SignalR przekazuje JWT przez query string (transport WebSocket nie ma headerów).
        options.Events = new JwtBearerEvents
        {
            OnMessageReceived = ctx =>
            {
                var accessToken = ctx.Request.Query["access_token"];
                var path = ctx.HttpContext.Request.Path;
                if (!string.IsNullOrEmpty(accessToken) && path.StartsWithSegments("/hubs"))
                {
                    ctx.Token = accessToken;
                }
                return Task.CompletedTask;
            },
        };
    });

builder.Services.AddAuthorization();

builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    options.AddPolicy("auth", httpCtx =>
        RateLimitPartition.GetFixedWindowLimiter(
            partitionKey: httpCtx.Connection.RemoteIpAddress?.ToString() ?? "anon",
            factory: _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = 10,
                Window = TimeSpan.FromMinutes(1),
                QueueProcessingOrder = QueueProcessingOrder.OldestFirst,
                QueueLimit = 0,
            }));

    // AI: drogie, partycjonowane po userId (a nie IP), żeby NAT-owani userzy nie kradli
    // sobie limitu nawzajem. Dla niezalogowanych — IP fallback. 30 wywołań / 15 min.
    options.AddPolicy("ai", httpCtx =>
    {
        var userId = httpCtx.User?.FindFirst("sub")?.Value
                    ?? httpCtx.User?.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value
                    ?? httpCtx.Connection.RemoteIpAddress?.ToString()
                    ?? "anon";
        return RateLimitPartition.GetFixedWindowLimiter(
            partitionKey: userId,
            factory: _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = 30,
                Window = TimeSpan.FromMinutes(15),
                QueueProcessingOrder = QueueProcessingOrder.OldestFirst,
                QueueLimit = 0,
            });
    });
});

builder.Services.AddHealthChecks()
    .AddDbContextCheck<AppDbContext>("database");

builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy => policy
        .WithOrigins("http://localhost:5173")
        .AllowAnyHeader()
        .AllowAnyMethod()
        .AllowCredentials());
});

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors();
app.UseRouting();
app.UseRateLimiter();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();
app.MapHub<LessonHub>("/hubs/lesson");
app.MapHealthChecks("/api/health/ready");

// Migrate i (opcjonalnie) seeduj. W testach z InMemory provider seeder się degraduje
// do EnsureCreated; w dev/prod uruchamia migracje EF Core.
{
    using var scope = app.Services.CreateScope();
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    var providerName = db.Database.ProviderName ?? string.Empty;
    var isInMemory = providerName.Contains("InMemory", StringComparison.OrdinalIgnoreCase);

    if (app.Environment.IsDevelopment())
    {
        await DatabaseSeeder.SeedAsync(db);
    }
    else if (!isInMemory)
    {
        await db.Database.MigrateAsync();
    }
}

app.Run();

// Expose for WebApplicationFactory<Program> in tests.
public partial class Program;
