using AgenticOcr.Application.Interfaces;
using AgenticOcr.Infrastructure.Data;
using AgenticOcr.Infrastructure.ExternalServices;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace AgenticOcr.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        services.AddDbContext<OcrDbContext>(options =>
            options.UseNpgsql(configuration.GetConnectionString("DefaultConnection")));

        services.AddScoped<IOcrService, TesseractOcrService>();
        services.AddScoped<FileStorageService>();

        return services;
    }
}