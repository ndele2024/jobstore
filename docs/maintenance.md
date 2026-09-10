# Guide de maintenance

Recettes concrètes pour faire évoluer le projet, dans l'ordre où les fichiers doivent être touchés.

---

## 1. Ajouter un champ à une offre

Exemple : ajouter `TeamSize` (taille de l'équipe).

| # | Fichier | Modification |
| --- | --- | --- |
| 1 | `backend/JobStore.Domain/Entities/JobOffer.cs` | `public int TeamSize { get; set; }` |
| 2 | `backend/JobStore.Application/DTOs/JobDtos.cs` | Ajouter le champ dans `UpsertJobRequest`, `JobDetailsDto` (et `JobCardDto` s'il doit apparaître dans la liste) |
| 3 | `backend/JobStore.Infrastructure/Services/Mapper.cs` | Reporter le champ dans `ToDetails` / `ToCard` |
| 4 | `backend/JobStore.Infrastructure/Services/JobService.cs` | Copier la valeur dans la méthode privée `Apply(job, request)` |
| 5 | `backend/JobStore.Infrastructure/Persistence/DemoDataSeeder.cs` | Renseigner les offres de démonstration |
| 6 | `frontend/src/app/core/models/api.models.ts` | Ajouter le champ dans `UpsertJobRequest` et `JobDetails` |
| 7 | `frontend/src/app/features/employer/job-form-page.ts` + `.html` | Contrôle de formulaire + champ dans le gabarit + valeur dans l'objet envoyé |
| 8 | `frontend/src/app/features/jobs/job-details-page.html` | Affichage |

Vérification : `dotnet build backend/JobStore.Api` puis `npm run build` dans `frontend/`.

---

## 2. Ajouter un endpoint

1. **Contrat** — déclarer la méthode dans l'interface concernée
   (`backend/JobStore.Application/Abstractions/Contracts.cs`), en renvoyant `Result` ou `Result<T>`.
2. **DTOs** — ajouter la requête et la réponse dans `JobStore.Application/DTOs/`.
   Les requêtes sont des `class` annotées (`[Required]`, `[EmailAddress]`, `[Range]`…),
   les réponses des `record`.
3. **Implémentation** — dans le service correspondant de `JobStore.Infrastructure/Services/`.
   Envelopper toute lecture/écriture dans `repository.Transaction(() => { ... })`.
4. **Contrôleur** — ajouter l'action et renvoyer `FromResult(...)` :

```csharp
[HttpPost("jobs/{jobId:guid}/duplicate")]
public IActionResult Duplicate(Guid jobId) =>
    FromResult(jobService.Duplicate(RequiredUserId, jobId));
```

5. **Frontend** — méthode dans le service `core/services/` correspondant, puis appel depuis la page.
6. **Documentation** — compléter `docs/api.md`.

---

## 3. Ajouter une page

1. Créer `frontend/src/app/features/<domaine>/<nom>-page.ts` (+ `.html`, `.scss`).
2. Copier le squelette d'une page existante : `ChangeDetectionStrategy.OnPush`, `inject()`,
   état en `signal()`.
3. Déclarer la route dans `app.routes.ts` avec `loadComponent` et le guard qui convient :

```ts
{
  path: 'entreprise/statistiques',
  canActivate: [roleGuard(UserRole.Employer)],
  loadComponent: () => import('./features/employer/stats-page').then(m => m.StatsPage),
  title: 'Statistiques - JobStore',
}
```

4. Si la page doit apparaître dans la navigation, l'ajouter à `navItems` dans
   `layout/main-layout.ts` (le menu est déjà filtré par rôle).

---

## 4. Ajouter une valeur d'enum

Trois fichiers, toujours les mêmes :

1. `backend/JobStore.Domain/Enums/Enums.cs` — **ajouter à la fin**, ne jamais renuméroter.
2. `backend/JobStore.Infrastructure/Services/Mapper.cs` — le libellé français dans le `switch`
   correspondant (il alimente aussi `/api/reference-data`).
3. `frontend/src/app/core/models/api.models.ts` et
   `frontend/src/app/core/utils/labels.ts` — la valeur et son libellé.

Les tables de libellés du frontend sont des `Record<Enum, string>` : TypeScript signale
l'entrée manquante à la compilation.

---

## 5. Passer à PostgreSQL

L'interface `IJobStoreRepository` est le seul point de contact avec le stockage.

1. Ajouter les paquets au projet `JobStore.Infrastructure` :

```bash
dotnet add backend/JobStore.Infrastructure package Microsoft.EntityFrameworkCore
dotnet add backend/JobStore.Infrastructure package Npgsql.EntityFrameworkCore.PostgreSQL
dotnet add backend/JobStore.Api package Microsoft.EntityFrameworkCore.Design
```

2. Créer `Persistence/JobStoreDbContext.cs` avec les `DbSet<>` des entités du domaine.
   Points d'attention : les listes `List<string>` (compétences, secteurs, tâches) demandent une
   conversion (`HasConversion` vers `jsonb` ou une table dédiée), et `ResumeDocument.Content`
   devrait être remplacé par un chemin de fichier plutôt que stocké en base.
3. Créer `Persistence/EfJobStoreRepository : IJobStoreRepository`. `Transaction` devient une
   vraie transaction de base de données au lieu d'un verrou en mémoire.
4. Dans `DependencyInjection.cs`, remplacer :

```csharp
services.AddSingleton<IJobStoreRepository, InMemoryJobStoreRepository>();
// par
services.AddDbContext<JobStoreDbContext>(o => o.UseNpgsql(connectionString));
services.AddScoped<IJobStoreRepository, EfJobStoreRepository>();
```

La chaîne de connexion est déjà dans `appsettings.json` (`ConnectionStrings:PostgreSql`).

5. Générer la migration initiale :

```bash
dotnet ef migrations add InitialCreate --project backend/JobStore.Infrastructure --startup-project backend/JobStore.Api
dotnet ef database update --project backend/JobStore.Infrastructure --startup-project backend/JobStore.Api
```

**Aucun service métier ni contrôleur n'a besoin d'être modifié.**

---

## 6. Envoyer de vrais courriels

Remplacer `LoggingEmailSender` par une implémentation SMTP ou SendGrid de `IEmailSender`,
l'enregistrer dans `DependencyInjection.cs`, puis dans `appsettings.json` :

```jsonc
"Security": {
  "ExposeVerificationCode": false,   // n'expose plus le code dans la réponse HTTP
  "DemoVerificationCode": ""         // vide = code aléatoire à 6 chiffres
}
```

Le frontend gère déjà l'absence de `devCode` : l'encart d'information disparaît simplement.

---

## 7. Améliorer la lecture des CV

L'extraction PDF actuelle ne lit que les segments de texte non compressés. Pour une extraction
complète :

```bash
dotnet add backend/JobStore.Infrastructure package PdfPig
```

puis remplacer la méthode `ExtractFromPdf` de `Services/ResumeParser.cs`. Le contrat
`IResumeParser` et tout le frontend restent inchangés.

Pour enrichir la détection, les listes `KnownSkills` et `KnownLanguages` du même fichier sont le
premier levier ; l'étape suivante serait un appel à un modèle de langage sur `rawTextPreview`.

---

## 8. Ajuster le calcul de correspondance

Tout est dans `backend/JobStore.Infrastructure/Services/MatchingService.cs`. Les pondérations
sont explicites :

```csharp
var total = (skillScore * 0.70d) + (locationScore * 0.15d) + (backgroundScore * 0.15d);
```

Le service renvoie aussi les listes `Matched` et `Missing`, affichées telles quelles dans
l'interface : si un signal est ajouté, penser à ce que l'utilisateur puisse encore comprendre
son score.

Attention : le score des candidatures est **figé au dépôt** (`JobApplication.MatchPercentage`).
Changer la formule ne modifie pas les candidatures existantes — c'est voulu, mais cela crée un
écart temporaire avec le score affiché sur la recherche.

---

## 9. Changer l'identité visuelle

- **Couleurs, rayons, ombres** : bloc `:root` de `frontend/src/styles.scss` (variables `--jb-*`).
- **Palette Material** : appel `mat.theme(...)` en haut du même fichier
  (`mat.$azure-palette`, `mat.$violet-palette`, `mat.$rose-palette`…).
- **Polices** : `frontend/src/index.html` (chargement) et la section `typography` de `mat.theme`.
- **Logo** : classe `.brand` dans `layout/main-layout.scss` et le texte dans `main-layout.html`.

---

## 10. Dépannage

| Symptôme | Cause probable | Solution |
| --- | --- | --- |
| « Impossible de joindre le serveur » | API non démarrée ou mauvais port | Lancer l'API ; vérifier `apiBaseUrl` dans `environment.ts` |
| Erreur CORS dans la console | Origine du frontend absente de la configuration | Ajouter l'origine dans `Cors:AllowedOrigins` (`appsettings.json`) |
| Une page s'affiche à moitié, sans erreur visible | Exception levée pendant le rendu du gabarit (souvent un pipe) | Ouvrir la console du navigateur : l'erreur y est complète. Cas déjà rencontré : `NG0701` du `DatePipe` faute de locale enregistrée |
| Un changement d'état n'apparaît pas à l'écran | Valeur stockée dans un champ ordinaire au lieu d'un `signal` | Passer par `signal()` — l'application tourne sans zone.js |
| Déconnexion inattendue | Jeton expiré (8 h) | Se reconnecter ; augmenter `TokenLifetimeMinutes` ou implémenter un jeton de rafraîchissement |
| Les données de démonstration ont disparu | Redémarrage de l'API (stockage en mémoire) | Comportement normal du prototype ; passer à PostgreSQL pour persister |
| `dotnet run` échoue sur un problème de droits | Dossier `DOTNET_CLI_HOME` | `$env:DOTNET_CLI_HOME=(Resolve-Path .dotnet-home).Path` à la racine du dépôt |

---

## 11. Commandes utiles

```bash
# Backend
dotnet build backend/JobStore.Api          # compilation
dotnet run --project backend/JobStore.Api  # démarrage de l'API

# Frontend
cd frontend
npm start                                   # serveur de développement
npm run build                               # build de production
```

Swagger (`http://localhost:5081/swagger`) permet de tester l'API sans le frontend : récupérer un
jeton via `/api/auth/login` puis `/api/auth/verify`, et le coller dans le bouton **Authorize**.
