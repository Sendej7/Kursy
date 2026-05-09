# ---------- builder ----------
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS builder
WORKDIR /src

# Copy solution + projects in layers, żeby cache restore'a pracował na lock-files,
# a nie na każdej zmianie kodu.
COPY EduPlatform.sln Directory.Build.props ./
COPY src/EduPlatform.Domain/*.csproj src/EduPlatform.Domain/
COPY src/EduPlatform.Infrastructure/*.csproj src/EduPlatform.Infrastructure/
COPY src/EduPlatform.AiService/*.csproj src/EduPlatform.AiService/
COPY src/EduPlatform.CodeRunner/*.csproj src/EduPlatform.CodeRunner/
COPY src/EduPlatform.Api/*.csproj src/EduPlatform.Api/
COPY tests/EduPlatform.Tests/*.csproj tests/EduPlatform.Tests/
RUN dotnet restore EduPlatform.sln

COPY . .
RUN dotnet publish src/EduPlatform.Api/EduPlatform.Api.csproj \
    -c Release \
    -o /app/publish \
    --no-restore \
    /p:UseAppHost=false

# ---------- runtime ----------
FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime
WORKDIR /app
ENV ASPNETCORE_URLS=http://+:8080
ENV DOTNET_RUNNING_IN_CONTAINER=true
ENV DOTNET_SYSTEM_GLOBALIZATION_INVARIANT=false

# ICU dla globalization (wymagane przez ASP.NET Core 10 do parsowania kultur PL)
RUN apt-get update && apt-get install -y --no-install-recommends \
        libicu-dev \
    && rm -rf /var/lib/apt/lists/*

COPY --from=builder /app/publish .

EXPOSE 8080
ENTRYPOINT ["dotnet", "EduPlatform.Api.dll"]
