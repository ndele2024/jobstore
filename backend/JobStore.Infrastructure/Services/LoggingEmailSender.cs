using JobStore.Application.Abstractions;
using JobStore.Domain.Enums;
using Microsoft.Extensions.Logging;

namespace JobStore.Infrastructure.Services;

/// <summary>
/// Implementation de developpement: le courriel est ecrit dans les logs de l'API.
/// A remplacer par un vrai service SMTP / SendGrid en production.
/// </summary>
public class LoggingEmailSender(ILogger<LoggingEmailSender> logger) : IEmailSender
{
    public void SendVerificationCode(string email, string code, VerificationPurpose purpose)
    {
        logger.LogInformation(
            "[JobStore] Code de verification {Code} envoye a {Email} pour {Purpose}.",
            code,
            email,
            purpose);
    }
}
