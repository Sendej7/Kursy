using EduPlatform.AiService;
using EduPlatform.CodeRunner;
using EduPlatform.Infrastructure;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
builder.Services.AddSignalR();

builder.Services.AddInfrastructure(builder.Configuration);
builder.Services.AddAiService(builder.Configuration);
builder.Services.AddSingleton<ICodeRunner, InMemoryCodeRunner>();

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
app.UseAuthorization();
app.MapControllers();

app.Run();
