FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

# copy csproj files and restore (build context is backend/)
COPY ["DLSimulator.Core/DLSimulator.Core.csproj","DLSimulator.Core/"]
COPY ["DLSimulator.API/DLSimulator.API.csproj","DLSimulator.API/"]
RUN dotnet restore "DLSimulator.API/DLSimulator.API.csproj"

# copy everything and publish
COPY . .
WORKDIR /src/DLSimulator.API
RUN dotnet publish -c Release -o /app/publish

FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime
WORKDIR /app
COPY --from=build /app/publish .
EXPOSE 80

# Use shell entry so we can pick up Render's $PORT at runtime
ENTRYPOINT ["sh","-c","ASPNETCORE_URLS=http://+:${PORT:-80} dotnet DLSimulator.API.dll"]
