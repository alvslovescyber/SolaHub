FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

COPY SolaHub.sln .
COPY src/SolaHub.Core/SolaHub.Core.csproj src/SolaHub.Core/
COPY src/SolaHub.Application/SolaHub.Application.csproj src/SolaHub.Application/
COPY src/SolaHub.Infrastructure/SolaHub.Infrastructure.csproj src/SolaHub.Infrastructure/
COPY src/SolaHub.API/SolaHub.API.csproj src/SolaHub.API/
COPY tests/SolaHub.Tests.Unit/SolaHub.Tests.Unit.csproj tests/SolaHub.Tests.Unit/
COPY tests/SolaHub.Tests.Integration/SolaHub.Tests.Integration.csproj tests/SolaHub.Tests.Integration/

RUN dotnet restore SolaHub.sln

COPY . .
RUN dotnet publish src/SolaHub.API/SolaHub.API.csproj \
    -c Release \
    -o /app/publish \
    --no-restore \
    /p:UseAppHost=false

FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime
WORKDIR /app

RUN adduser --disabled-password --gecos "" appuser && chown -R appuser /app
USER appuser

COPY --from=build --chown=appuser /app/publish .

ENV ASPNETCORE_ENVIRONMENT=Production
ENV ASPNETCORE_URLS=http://+:8080

EXPOSE 8080
ENTRYPOINT ["dotnet", "SolaHub.API.dll"]
