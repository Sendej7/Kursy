using EduPlatform.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace EduPlatform.Infrastructure.Persistence;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
    {
    }

    public DbSet<User> Users => Set<User>();
    public DbSet<Course> Courses => Set<Course>();
    public DbSet<Module> Modules => Set<Module>();
    public DbSet<Lesson> Lessons => Set<Lesson>();
    public DbSet<Exercise> Exercises => Set<Exercise>();
    public DbSet<Submission> Submissions => Set<Submission>();
    public DbSet<LessonProgress> LessonProgresses => Set<LessonProgress>();
    public DbSet<AiInteraction> AiInteractions => Set<AiInteraction>();
    public DbSet<CourseEnrollment> CourseEnrollments => Set<CourseEnrollment>();
    public DbSet<RefreshToken> RefreshTokens => Set<RefreshToken>();
    public DbSet<Certificate> Certificates => Set<Certificate>();
    public DbSet<Subscription> Subscriptions => Set<Subscription>();
    public DbSet<BillingProfile> BillingProfiles => Set<BillingProfile>();
    public DbSet<Invoice> Invoices => Set<Invoice>();
    public DbSet<Organization> Organizations => Set<Organization>();
    public DbSet<OrganizationCode> OrganizationCodes => Set<OrganizationCode>();
    public DbSet<OrganizationCodeRedemption> OrganizationCodeRedemptions => Set<OrganizationCodeRedemption>();
    public DbSet<CourseReview> CourseReviews => Set<CourseReview>();
    public DbSet<Notification> Notifications => Set<Notification>();
    public DbSet<LessonQuestion> LessonQuestions => Set<LessonQuestion>();
    public DbSet<LessonAnswer> LessonAnswers => Set<LessonAnswer>();
    public DbSet<LessonAnswerVote> LessonAnswerVotes => Set<LessonAnswerVote>();
    public DbSet<CourseFavorite> CourseFavorites => Set<CourseFavorite>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(AppDbContext).Assembly);
        base.OnModelCreating(modelBuilder);
    }

    public override Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        var now = DateTime.UtcNow;
        foreach (var entry in ChangeTracker.Entries<Entity>())
        {
            if (entry.State == EntityState.Added)
            {
                entry.Entity.CreatedAt = now;
            }
            entry.Entity.UpdatedAt = now;
        }
        return base.SaveChangesAsync(cancellationToken);
    }
}
