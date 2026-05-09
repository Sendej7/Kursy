namespace EduPlatform.AiService;

public class ClaudeOptions
{
    public const string SectionName = "Claude";

    public string ApiKey { get; set; } = string.Empty;
    public string BaseUrl { get; set; } = "https://api.anthropic.com";
    public string Model { get; set; } = "claude-sonnet-4-6";
    public int MaxTokens { get; set; } = 1024;
}
