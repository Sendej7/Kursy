using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace EduPlatform.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddLessonQA : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "LessonAnswers",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    QuestionId = table.Column<Guid>(type: "uuid", nullable: false),
                    AuthorId = table.Column<Guid>(type: "uuid", nullable: false),
                    Body = table.Column<string>(type: "character varying(8000)", maxLength: 8000, nullable: false),
                    Upvotes = table.Column<int>(type: "integer", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_LessonAnswers", x => x.Id);
                    table.ForeignKey(
                        name: "FK_LessonAnswers_Users_AuthorId",
                        column: x => x.AuthorId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "LessonAnswerVotes",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    AnswerId = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_LessonAnswerVotes", x => x.Id);
                    table.ForeignKey(
                        name: "FK_LessonAnswerVotes_LessonAnswers_AnswerId",
                        column: x => x.AnswerId,
                        principalTable: "LessonAnswers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_LessonAnswerVotes_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "LessonQuestions",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    LessonId = table.Column<Guid>(type: "uuid", nullable: false),
                    AuthorId = table.Column<Guid>(type: "uuid", nullable: false),
                    Title = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: false),
                    Body = table.Column<string>(type: "character varying(8000)", maxLength: 8000, nullable: true),
                    AcceptedAnswerId = table.Column<Guid>(type: "uuid", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_LessonQuestions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_LessonQuestions_LessonAnswers_AcceptedAnswerId",
                        column: x => x.AcceptedAnswerId,
                        principalTable: "LessonAnswers",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_LessonQuestions_Lessons_LessonId",
                        column: x => x.LessonId,
                        principalTable: "Lessons",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_LessonQuestions_Users_AuthorId",
                        column: x => x.AuthorId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_LessonAnswers_AuthorId",
                table: "LessonAnswers",
                column: "AuthorId");

            migrationBuilder.CreateIndex(
                name: "IX_LessonAnswers_QuestionId_Upvotes",
                table: "LessonAnswers",
                columns: new[] { "QuestionId", "Upvotes" });

            migrationBuilder.CreateIndex(
                name: "IX_LessonAnswerVotes_AnswerId_UserId",
                table: "LessonAnswerVotes",
                columns: new[] { "AnswerId", "UserId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_LessonAnswerVotes_UserId",
                table: "LessonAnswerVotes",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_LessonQuestions_AcceptedAnswerId",
                table: "LessonQuestions",
                column: "AcceptedAnswerId");

            migrationBuilder.CreateIndex(
                name: "IX_LessonQuestions_AuthorId",
                table: "LessonQuestions",
                column: "AuthorId");

            migrationBuilder.CreateIndex(
                name: "IX_LessonQuestions_LessonId_CreatedAt",
                table: "LessonQuestions",
                columns: new[] { "LessonId", "CreatedAt" });

            migrationBuilder.AddForeignKey(
                name: "FK_LessonAnswers_LessonQuestions_QuestionId",
                table: "LessonAnswers",
                column: "QuestionId",
                principalTable: "LessonQuestions",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_LessonAnswers_LessonQuestions_QuestionId",
                table: "LessonAnswers");

            migrationBuilder.DropTable(
                name: "LessonAnswerVotes");

            migrationBuilder.DropTable(
                name: "LessonQuestions");

            migrationBuilder.DropTable(
                name: "LessonAnswers");
        }
    }
}
