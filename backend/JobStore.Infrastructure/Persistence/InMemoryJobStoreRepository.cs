using JobStore.Application.Abstractions;
using JobStore.Domain.Entities;

namespace JobStore.Infrastructure.Persistence;

/// <summary>
/// Depot en memoire, enregistre en singleton.
/// Toutes les mutations passent par <see cref="Transaction{T}"/> pour rester coherentes
/// malgre les requetes HTTP concurrentes.
/// </summary>
public class InMemoryJobStoreRepository : IJobStoreRepository
{
    private readonly Lock _gate = new();
    private readonly List<UserAccount> _users = [];
    private readonly List<JobOffer> _jobs = [];
    private readonly List<JobApplication> _applications = [];
    private readonly List<JobView> _views = [];
    private readonly List<VerificationCode> _codes = [];

    public InMemoryJobStoreRepository(IPasswordHasher passwordHasher)
    {
        DemoDataSeeder.Seed(passwordHasher, _users, _jobs, _applications, _views);
    }

    public IReadOnlyCollection<UserAccount> Users => _users;
    public IReadOnlyCollection<JobOffer> Jobs => _jobs;
    public IReadOnlyCollection<JobApplication> Applications => _applications;
    public IReadOnlyCollection<JobView> Views => _views;
    public IReadOnlyCollection<VerificationCode> VerificationCodes => _codes;

    public UserAccount? FindUser(Guid id) => _users.FirstOrDefault(u => u.Id == id);

    public UserAccount? FindUserByEmail(string email) =>
        _users.FirstOrDefault(u => string.Equals(u.Email, email, StringComparison.OrdinalIgnoreCase));

    public void AddUser(UserAccount user) => _users.Add(user);

    public JobOffer? FindJob(Guid id) => _jobs.FirstOrDefault(j => j.Id == id);

    public void AddJob(JobOffer job) => _jobs.Add(job);

    public void RemoveJob(JobOffer job) => _jobs.Remove(job);

    public JobApplication? FindApplication(Guid id) => _applications.FirstOrDefault(a => a.Id == id);

    public void AddApplication(JobApplication application) => _applications.Add(application);

    public void RemoveApplication(JobApplication application) => _applications.Remove(application);

    public JobView? FindView(Guid jobId, Guid userId) =>
        _views.FirstOrDefault(v => v.JobOfferId == jobId && v.UserId == userId);

    public void AddView(JobView view) => _views.Add(view);

    public VerificationCode? FindVerificationCode(Guid id) => _codes.FirstOrDefault(c => c.Id == id);

    public void AddVerificationCode(VerificationCode code)
    {
        _codes.Add(code);

        // Nettoyage opportuniste des codes expires depuis plus d'une heure.
        _codes.RemoveAll(c => c.ExpiresAtUtc < DateTime.UtcNow.AddHours(-1));
    }

    public T Transaction<T>(Func<T> action)
    {
        lock (_gate)
        {
            return action();
        }
    }

    public void Transaction(Action action)
    {
        lock (_gate)
        {
            action();
        }
    }
}
