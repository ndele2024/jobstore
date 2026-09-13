using JobStore.Application.DTOs;
using JobStore.Domain.Entities;
using JobStore.Domain.Enums;

namespace JobStore.Application.Abstractions;

/// <summary>
/// Resultat uniforme des services applicatifs.
/// Evite de faire remonter des exceptions pour les erreurs metier previsibles.
/// </summary>
public class Result
{
    protected Result(bool success, string error, int statusCode)
    {
        Success = success;
        Error = error;
        StatusCode = statusCode;
    }

    public bool Success { get; }
    public string Error { get; }
    public int StatusCode { get; }

    public static Result Ok() => new(true, string.Empty, 200);
    public static Result Fail(string error, int statusCode = 400) => new(false, error, statusCode);
    public static Result NotFound(string error = "Ressource introuvable.") => new(false, error, 404);
    public static Result Forbidden(string error = "Action non autorisee.") => new(false, error, 403);
}

/// <summary>Resultat typique portant une valeur.</summary>
public sealed class Result<T> : Result
{
    private Result(bool success, T? value, string error, int statusCode)
        : base(success, error, statusCode) => Value = value;

    public T? Value { get; }

    public static Result<T> Ok(T value) => new(true, value, string.Empty, 200);
    public static new Result<T> Fail(string error, int statusCode = 400) => new(false, default, error, statusCode);
    public static new Result<T> NotFound(string error = "Ressource introuvable.") => new(false, default, error, 404);
    public static new Result<T> Forbidden(string error = "Action non autorisee.") => new(false, default, error, 403);
}

/// <summary>Depot de donnees. Une implementation en memoire est fournie; une implementation EF Core peut la remplacer.</summary>
public interface IJobStoreRepository
{
    IReadOnlyCollection<UserAccount> Users { get; }
    IReadOnlyCollection<JobOffer> Jobs { get; }
    IReadOnlyCollection<JobApplication> Applications { get; }
    IReadOnlyCollection<JobView> Views { get; }
    IReadOnlyCollection<VerificationCode> VerificationCodes { get; }

    UserAccount? FindUser(Guid id);
    UserAccount? FindUserByEmail(string email);
    void AddUser(UserAccount user);

    JobOffer? FindJob(Guid id);
    void AddJob(JobOffer job);
    void RemoveJob(JobOffer job);

    JobApplication? FindApplication(Guid id);
    void AddApplication(JobApplication application);
    void RemoveApplication(JobApplication application);

    JobView? FindView(Guid jobId, Guid userId);
    void AddView(JobView view);

    VerificationCode? FindVerificationCode(Guid id);
    void AddVerificationCode(VerificationCode code);

    /// <summary>Execute une action sous verrou pour proteger les collections en memoire.</summary>
    T Transaction<T>(Func<T> action);
    void Transaction(Action action);
}

/// <summary>Hashage et verification des mots de passe.</summary>
public interface IPasswordHasher
{
    string Hash(string password);
    bool Verify(string password, string hash);
}

/// <summary>Generation des jetons JWT.</summary>
public interface ITokenService
{
    (string Token, DateTime ExpiresAtUtc) CreateToken(UserAccount user);
}

/// <summary>Envoi des courriels (codes de verification). Journalise en developpement.</summary>
public interface IEmailSender
{
    void SendVerificationCode(string email, string code, VerificationPurpose purpose);
}

/// <summary>
/// Analyse d'un CV par un modele de langage (implementation: API Claude)
/// et extraction des informations structurees du profil candidat.
/// </summary>
public interface IResumeAnalyzer
{
    /// <summary>Faux si aucune cle d'API n'est configuree: l'analyse est alors indisponible.</summary>
    bool IsConfigured { get; }

    Task<Result<ResumeAnalysisDto>> AnalyzeAsync(
        Guid resumeId,
        string fileName,
        byte[] content,
        CancellationToken cancellationToken);
}

/// <summary>Calcul du pourcentage de correspondance profil / offre.</summary>
public interface IMatchingService
{
    (int Percentage, List<string> Matched, List<string> Missing) Evaluate(UserAccount employee, JobOffer job);
}

public interface IAuthService
{
    Result<VerificationChallengeResponse> RegisterEmployee(RegisterEmployeeRequest request);
    Result<VerificationChallengeResponse> RegisterEmployer(RegisterEmployerRequest request);
    Result<VerificationChallengeResponse> Login(LoginRequest request);
    Result<AuthResponse> VerifyCode(VerifyCodeRequest request);
    Result<VerificationChallengeResponse> ResendCode(ResendCodeRequest request);
    Result<VerificationChallengeResponse> RequestEmailChange(Guid userId, ChangeEmailRequest request);
    Result ChangePassword(Guid userId, ChangePasswordRequest request);
    Result<AuthUserDto> GetCurrentUser(Guid userId);
}

public interface IProfileService
{
    Result<EmployeeProfileDto> GetEmployeeProfile(Guid userId);
    Result<EmployeeProfileDto> UpdatePersonalInfo(Guid userId, UpdatePersonalInfoRequest request);
    Result<EmployeeProfileDto> UpdateSkills(Guid userId, UpdateSkillsRequest request);

    Result<EducationDto> AddEducation(Guid userId, EducationRequest request);
    Result<EducationDto> UpdateEducation(Guid userId, Guid educationId, EducationRequest request);
    Result DeleteEducation(Guid userId, Guid educationId);

    Result<ExperienceDto> AddExperience(Guid userId, ExperienceRequest request);
    Result<ExperienceDto> UpdateExperience(Guid userId, Guid experienceId, ExperienceRequest request);
    Result DeleteExperience(Guid userId, Guid experienceId);

    Result<LanguageDto> AddLanguage(Guid userId, LanguageRequest request);
    Result<LanguageDto> UpdateLanguage(Guid userId, Guid languageId, LanguageRequest request);
    Result DeleteLanguage(Guid userId, Guid languageId);

    Result<CertificationDto> AddCertification(Guid userId, CertificationRequest request);
    Result<CertificationDto> UpdateCertification(Guid userId, Guid certificationId, CertificationRequest request);
    Result DeleteCertification(Guid userId, Guid certificationId);

    Result<ResumeDto> UploadResume(Guid userId, string fileName, string contentType, byte[] content);
    Task<Result<ResumeAnalysisDto>> AnalyzeResumeAsync(Guid userId, Guid resumeId, CancellationToken cancellationToken);
    Result<IReadOnlyCollection<ResumeDto>> GetResumes(Guid userId);
    Result SetDefaultResume(Guid userId, Guid resumeId);
    Result DeleteResume(Guid userId, Guid resumeId);
    Result<(string FileName, string ContentType, byte[] Content)> DownloadResume(Guid requesterId, Guid ownerId, Guid resumeId);

    Result<EmployerProfileDto> GetEmployerProfile(Guid userId);
    Result<EmployerProfileDto> UpdateEmployerInfo(Guid userId, UpdateEmployerInfoRequest request);
}

public interface IJobService
{
    JobSearchResponse Search(JobSearchRequest request, Guid? viewerId);
    Result<JobDetailsDto> GetDetails(Guid jobId, Guid? viewerId);
    Result<IReadOnlyCollection<JobCardDto>> GetEmployerJobs(Guid employerId, JobStatus? status);
    Result<EmployerJobDetailsDto> GetEmployerJobDetails(Guid employerId, Guid jobId);
    Result<JobDetailsDto> CreateJob(Guid employerId, UpsertJobRequest request);
    Result<JobDetailsDto> UpdateJob(Guid employerId, Guid jobId, UpsertJobRequest request);
    Result<JobDetailsDto> UpdateStatus(Guid employerId, Guid jobId, UpdateJobStatusRequest request);
    Result DeleteJob(Guid employerId, Guid jobId);
}

public interface IApplicationService
{
    Result<MyApplicationDto> Submit(Guid employeeId, Guid jobId, SubmitApplicationRequest request);
    Result<IReadOnlyCollection<MyApplicationDto>> GetMyApplications(Guid employeeId, ApplicationStatus? status);
    Result<JobApplicantDto> UpdateStatus(Guid employerId, Guid applicationId, UpdateApplicationStatusRequest request);
    Result WithdrawApplication(Guid employeeId, Guid applicationId);
}

public interface IDashboardService
{
    Result<EmployeeDashboardDto> GetEmployeeDashboard(Guid userId);
    Result<EmployerDashboardDto> GetEmployerDashboard(Guid userId);
    AdminDashboardDto GetAdminDashboard();
    IReadOnlyCollection<AdminUserDto> GetUsersByRole(UserRole role);
    Result ToggleUserActivation(Guid userId, bool isActive);
}

public interface IReferenceDataService
{
    ReferenceDataDto Get();
}
