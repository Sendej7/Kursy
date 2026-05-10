using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace EduPlatform.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddDailyGoalReminder : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "DailyGoalReminderEnabled",
                table: "Users",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<DateTime>(
                name: "DailyGoalReminderLastSent",
                table: "Users",
                type: "timestamp with time zone",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "DailyGoalReminderEnabled",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "DailyGoalReminderLastSent",
                table: "Users");
        }
    }
}
