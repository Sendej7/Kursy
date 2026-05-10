using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace EduPlatform.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddAiMentorPromptOverride : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "AiMentorPromptOverride",
                table: "Courses",
                type: "text",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "AiMentorPromptOverride",
                table: "Courses");
        }
    }
}
