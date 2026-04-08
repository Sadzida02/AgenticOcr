FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS base
WORKDIR /app
EXPOSE 8080

FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src
COPY ["AgenticOcr.Api/AgenticOcr.Api.csproj", "AgenticOcr.Api/"]
COPY ["AgenticOcr.Application/AgenticOcr.Application.csproj", "AgenticOcr.Application/"]
COPY ["AgenticOcr.Domain/AgenticOcr.Domain.csproj", "AgenticOcr.Domain/"]
COPY ["AgenticOcr.Infrastructure/AgenticOcr.Infrastructure.csproj", "AgenticOcr.Infrastructure/"]
RUN dotnet restore "AgenticOcr.Api/AgenticOcr.Api.csproj"
COPY . .
WORKDIR "/src/AgenticOcr.Api"
RUN dotnet build "AgenticOcr.Api.csproj" -c Release -o /app/build

FROM build AS publish
RUN dotnet publish "AgenticOcr.Api.csproj" -c Release -o /app/publish

FROM base AS final
WORKDIR /app
COPY --from=publish /app/publish .
ENTRYPOINT ["dotnet", "AgenticOcr.Api.dll"]