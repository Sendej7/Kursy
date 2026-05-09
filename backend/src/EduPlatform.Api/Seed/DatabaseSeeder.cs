using EduPlatform.Domain.Entities;
using EduPlatform.Domain.Enums;
using EduPlatform.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace EduPlatform.Api.Seed;

public static class DatabaseSeeder
{
    public static async Task SeedAsync(AppDbContext db, CancellationToken ct = default)
    {
        await db.Database.EnsureCreatedAsync(ct);

        if (await db.Courses.AnyAsync(ct)) return;

        var demoAuthor = await db.Users.FirstOrDefaultAsync(u => u.Email == "demo@kursy.pl", ct);
        if (demoAuthor is null)
        {
            demoAuthor = new User
            {
                Email = "demo@kursy.pl",
                DisplayName = "Demo Autor",
                PasswordHash = BCrypt.Net.BCrypt.HashPassword("demo1234"),
                Role = UserRole.Author,
            };
            db.Users.Add(demoAuthor);
            await db.SaveChangesAsync(ct);
        }

        var course = new Course
        {
            Title = "Python od zera",
            Slug = "python-od-zera",
            Description = "Pierwszy kurs na platformie. Uczy podstaw Pythona — od zmiennych po pętle.",
            Language = CourseLanguage.Python,
            Visibility = CourseVisibility.Public,
            PriceMonthlyPln = null,
            AuthorId = demoAuthor.Id,
        };

        var module1 = new Module
        {
            Title = "Podstawy",
            Description = "Zmienne, typy, operatory.",
            Order = 1,
            Course = course,
        };

        var lesson1 = new Lesson
        {
            Title = "Cześć, świecie!",
            Order = 1,
            Type = LessonType.Exercise,
            ContentMarkdown = """
                ## Cześć, świecie!

                Pierwszy program w każdym języku to zwykle wypisanie tekstu na ekran.
                W Pythonie służy do tego funkcja `print`.

                ```python
                print("Hello, world!")
                ```

                ### Spróbuj sam
                Wypisz tekst `Cześć, świecie!` (z polskimi literami).
                """,
            Module = module1,
            Exercise = new Exercise
            {
                Prompt = "Wypisz na ekranie tekst: Cześć, świecie!",
                StarterCode = "# napisz tu kod\n",
                SolutionCode = "print(\"Cześć, świecie!\")\n",
                TestsCode = """
                    def test_output(stdout):
                        assert "Cześć, świecie!" in stdout
                    """,
                Hints = new List<string>
                {
                    "Użyj funkcji print().",
                    "Tekst owija się w cudzysłowy.",
                },
            },
        };

        var lesson2 = new Lesson
        {
            Title = "Zmienne",
            Order = 2,
            Type = LessonType.Exercise,
            ContentMarkdown = """
                ## Zmienne

                Zmienna to nazwa pod którą przechowujesz wartość.

                ```python
                imie = "Ala"
                wiek = 30
                print(imie, wiek)
                ```

                ### Spróbuj sam
                Stwórz zmienną `imie` z Twoim imieniem i wypisz ją na ekran.
                """,
            Module = module1,
            Exercise = new Exercise
            {
                Prompt = "Stwórz zmienną `imie` i wypisz jej wartość.",
                StarterCode = "imie = ...\nprint(...)\n",
                SolutionCode = "imie = \"Ala\"\nprint(imie)\n",
                TestsCode = """
                    def test_variable_used(stdout, locals_):
                        assert "imie" in locals_
                        assert str(locals_["imie"]) in stdout
                    """,
                Hints = new List<string>
                {
                    "Po znaku = przypisujesz wartość.",
                    "Tekst musi być w cudzysłowach.",
                },
            },
        };

        var module2 = new Module
        {
            Title = "Pętle i warunki",
            Description = "Powtórzenia kodu i decyzje.",
            Order = 2,
            Course = course,
        };

        var lesson3 = new Lesson
        {
            Title = "Pętla for",
            Order = 1,
            Type = LessonType.Exercise,
            ContentMarkdown = """
                ## Pętla for

                Pętla `for` pozwala wykonać blok kodu wielokrotnie.

                ```python
                for i in range(3):
                    print(i)
                ```

                Wypisze: `0`, `1`, `2`.

                ### Spróbuj sam
                Napisz pętlę, która wypisze liczby od 1 do 5 (włącznie).
                """,
            Module = module2,
            Exercise = new Exercise
            {
                Prompt = "Wypisz liczby od 1 do 5.",
                StarterCode = "for i in range(...):\n    print(i)\n",
                SolutionCode = "for i in range(1, 6):\n    print(i)\n",
                TestsCode = """
                    def test_output(stdout):
                        for n in [1, 2, 3, 4, 5]:
                            assert str(n) in stdout
                    """,
                Hints = new List<string>
                {
                    "range(a, b) idzie od a do b-1.",
                    "Aby uzyskać 1..5, użyj range(1, 6).",
                },
            },
        };

        course.Modules = new List<Module> { module1, module2 };
        module1.Lessons = new List<Lesson> { lesson1, lesson2 };
        module2.Lessons = new List<Lesson> { lesson3 };

        db.Courses.Add(course);
        await db.SaveChangesAsync(ct);
    }
}
