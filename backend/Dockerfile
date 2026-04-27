# ── Stage 1: Build ────────────────────────────────────────────────────────────
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

# Copy project files first (layer caching)
COPY backend/DLSimulator.API/DLSimulator.API.csproj ./DLSimulator.API/
COPY backend/DLSimulator.Core/DLSimulator.Core.csproj ./DLSimulator.Core/

# Restore dependencies
RUN dotnet restore DLSimulator.API/DLSimulator.API.csproj

# Copy everything else and publish
COPY backend/ .
RUN dotnet publish DLSimulator.API/DLSimulator.API.csproj -c Release -o /app/publish

# ── Stage 2: Runtime ──────────────────────────────────────────────────────────
FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime
WORKDIR /app

COPY --from=build /app/publish .

# Railway injects PORT — ARG makes it available at build time, ENV at runtime
ARG PORT=8080
ENV ASPNETCORE_URLS=http://+:${PORT}

EXPOSE ${PORT}

ENTRYPOINT ["dotnet", "DLSimulator.API.dll"]