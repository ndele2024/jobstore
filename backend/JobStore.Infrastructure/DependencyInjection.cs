using JobStore.Application.Abstractions;
using JobStore.Infrastructure.Persistence;
using JobStore.Infrastructure.Services;
using Microsoft.Extensions.DependencyInjection;

namespace JobStore.Infrastructure;

/// <summary>Point d'entree unique pour brancher l'infrastructure sur le conteneur d'injection.</summary>
public static class DependencyInjection
{
    public static IServiceCollection AddJobStoreInfrastructure(this IServiceCollection services)
    {
        // Services techniques
        services.AddSingleton<IPasswordHasher, PasswordHasher>();
        services.AddSingleton<ITokenService, JwtTokenService>();
        services.AddSingleton<IEmailSender, LoggingEmailSender>();
        services.AddSingleton<IResumeParser, ResumeParser>();
        services.AddSingleton<IMatchingService, MatchingService>();

        // Persistence: singleton car les donnees vivent en memoire pour la duree du processus.
        services.AddSingleton<IJobStoreRepository, InMemoryJobStoreRepository>();

        // Services applicatifs
        services.AddScoped<IAuthService, AuthService>();
        services.AddScoped<IProfileService, ProfileService>();
        services.AddScoped<IJobService, JobService>();
        services.AddScoped<IApplicationService, ApplicationService>();
        services.AddScoped<IDashboardService, DashboardService>();
        services.AddScoped<IReferenceDataService, ReferenceDataService>();

        return services;
    }
}
