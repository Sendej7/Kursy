using System.Text;
using EduPlatform.Domain.Enums;
using EduPlatform.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace EduPlatform.Api.Controllers;

/// <summary>
/// sitemap.xml — lista publicznych kursów dla Google. Cache 1h żeby nie ddosować bazy
/// (Googlebot crawl ~kilka razy dziennie).
/// </summary>
[ApiController]
[Route("sitemap.xml")]
[AllowAnonymous]
public class SitemapController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly IConfiguration _config;

    public SitemapController(AppDbContext db, IConfiguration config)
    {
        _db = db;
        _config = config;
    }

    [HttpGet]
    [ResponseCache(Duration = 3600, Location = ResponseCacheLocation.Any)]
    public async Task<IActionResult> Get(CancellationToken ct)
    {
        var baseUrl = (_config.GetValue<string>("App:BaseUrl") ?? "https://kursy.pl").TrimEnd('/');

        var courses = await _db.Courses
            .Where(c => c.Visibility == CourseVisibility.Public)
            .Select(c => new { c.Slug, c.UpdatedAt })
            .ToListAsync(ct);

        var sb = new StringBuilder();
        sb.AppendLine(@"<?xml version=""1.0"" encoding=""UTF-8""?>");
        sb.AppendLine(@"<urlset xmlns=""http://www.sitemaps.org/schemas/sitemap/0.9"">");

        // Static landing pages.
        AddUrl(sb, $"{baseUrl}/", DateTime.UtcNow, "daily", 1.0);
        AddUrl(sb, $"{baseUrl}/courses", DateTime.UtcNow, "daily", 0.9);
        AddUrl(sb, $"{baseUrl}/leaderboard", DateTime.UtcNow, "weekly", 0.5);
        AddUrl(sb, $"{baseUrl}/pricing", DateTime.UtcNow, "monthly", 0.7);
        AddUrl(sb, $"{baseUrl}/terms", DateTime.UtcNow, "yearly", 0.2);
        AddUrl(sb, $"{baseUrl}/privacy", DateTime.UtcNow, "yearly", 0.2);

        // Public courses.
        foreach (var c in courses)
        {
            AddUrl(sb, $"{baseUrl}/courses/{c.Slug}", c.UpdatedAt, "weekly", 0.8);
        }

        sb.AppendLine("</urlset>");
        return Content(sb.ToString(), "application/xml", Encoding.UTF8);
    }

    private static void AddUrl(StringBuilder sb, string loc, DateTime lastmod, string changefreq, double priority)
    {
        sb.AppendLine("  <url>");
        sb.AppendLine($"    <loc>{System.Net.WebUtility.HtmlEncode(loc)}</loc>");
        sb.AppendLine($"    <lastmod>{lastmod:yyyy-MM-dd}</lastmod>");
        sb.AppendLine($"    <changefreq>{changefreq}</changefreq>");
        sb.AppendLine($"    <priority>{priority.ToString("0.0", System.Globalization.CultureInfo.InvariantCulture)}</priority>");
        sb.AppendLine("  </url>");
    }
}
