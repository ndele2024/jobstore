# Architecture JobStore

## 1. Vue d'ensemble

```
┌──────────────────────────────┐        HTTP + JWT        ┌──────────────────────────────┐
│  Frontend Angular 21          │ ───────────────────────► │  API ASP.NET Core 9           │
│  http://localhost:4200        │ ◄─────────────────────── │  http://localhost:5081        │
│                               │        JSON              │                               │
│  signaux + Angular Material   │                          │  contrôleurs REST + Swagger   │
└──────────────────────────────┘                          └──────────────┬───────────────┘
                                                                          │
                                                          ┌───────────────▼───────────────┐
                                                          │  Dépôt en mémoire (singleton) │
                                                          │  IJobStoreRepository          │
                                                          └───────────────────────────────┘
```

Le dépôt est masqué derrière une interface : remplacer l'implémentation en mémoire par une
implémentation EF Core / PostgreSQL ne demande aucun changement dans les services métier ni
dans les contrôleurs.

---

## 2. Backend — quatre couches

L'ordre des dépendances va toujours de l'extérieur vers l'intérieur : `Api → Infrastructure → Application → Domain`.

### 2.1 `JobStore.Domain`

Entités métier et énumérations. **Aucune dépendance** vers un framework.

| Fichier | Contenu |
| --- | --- |
| `Entities/UserAccount.cs` | Compte unique aux trois rôles. Les propriétés propres à un rôle restent vides pour les autres (`CompanyName` pour l'entreprise, `Educations`/`Experiences`/… pour le candidat). |
| `Entities/ProfileItems.cs` | `Education`, `Experience`, `LanguageSkill`, `Certification`, `ResumeDocument`. |
| `Entities/JobOffer.cs` | Offre d'emploi. La propriété calculée `IsVisible` centralise la règle « publiée **et** non expirée ». |
| `Entities/JobApplication.cs` | Candidature : CV choisi, lettre, statut, score de correspondance figé au dépôt. |
| `Entities/JobView.cs` | Trace de consultation (un enregistrement par couple offre/utilisateur, avec un compteur). |
| `Entities/VerificationCode.cs` | Code à 6 chiffres. `IsUsable` encapsule expiration, consommation et nombre d'essais. |
| `Enums/Enums.cs` | `UserRole`, `JobStatus`, `ApplicationStatus`, `LanguageLevel`, `VerificationPurpose`, `ContractType`, `WorkMode`. |

> Les valeurs numériques des enums sont **partagées avec le frontend**
> (`frontend/src/app/core/models/api.models.ts`). Toute modification doit être faite des deux côtés.

### 2.2 `JobStore.Application`

Contrats et objets de transfert. C'est le vocabulaire commun aux deux autres couches.

- `Abstractions/Contracts.cs` : le type `Result` / `Result<T>` et **toutes** les interfaces
  (`IJobStoreRepository`, `IAuthService`, `IProfileService`, `IJobService`, `IApplicationService`,
  `IDashboardService`, `IReferenceDataService`, plus les services techniques `IPasswordHasher`,
  `ITokenService`, `IEmailSender`, `IResumeParser`, `IMatchingService`).
- `DTOs/AuthDtos.cs`, `DTOs/ProfileDtos.cs`, `DTOs/JobDtos.cs`, `DTOs/DashboardDtos.cs` :
  requêtes (classes annotées `[Required]`, `[EmailAddress]`, `[Compare]`…) et réponses (`record`).

**Le patron `Result`** évite les exceptions pour les erreurs métier prévisibles :

```csharp
public Result<JobDetailsDto> UpdateJob(...)
{
    if (job is null)               return Result<JobDetailsDto>.NotFound("Offre introuvable.");
    if (job.EmployerId != caller)  return Result<JobDetailsDto>.Forbidden("...");
    ...
    return Result<JobDetailsDto>.Ok(dto);
}
```

Le contrôleur traduit ensuite `Result` en réponse HTTP via `ApiControllerBase.FromResult` :
succès → `200`/`204`, échec → le `StatusCode` porté par le résultat avec un corps `{ message, statusCode }`.

### 2.3 `JobStore.Infrastructure`

Implémentations concrètes.

| Fichier | Rôle |
| --- | --- |
| `Persistence/InMemoryJobStoreRepository.cs` | Listes en mémoire, protégées par un verrou. Enregistré en **singleton**. |
| `Persistence/DemoDataSeeder.cs` | Jeu de données de démonstration, identifiants fixes. |
| `Services/AuthService.cs` | Inscription, connexion en deux étapes, changement de courriel / mot de passe. |
| `Services/ProfileService.cs` | Profil candidat (sections CRUD, CV) et profil entreprise. |
| `Services/JobService.cs` | Recherche publique, détail, CRUD employeur, statistiques de consultation. |
| `Services/ApplicationService.cs` | Dépôt, suivi et changement de statut des candidatures. |
| `Services/DashboardService.cs` | Agrégations des trois tableaux de bord. |
| `Services/ReferenceDataService.cs` | Listes de référence des formulaires. |
| `Services/MatchingService.cs` | Calcul du pourcentage de correspondance. |
| `Services/ResumeParser.cs` | Extraction de texte d'un CV et détection des champs. |
| `Services/PasswordHasher.cs` | PBKDF2-SHA256, 100 000 itérations, sel de 16 octets. |
| `Services/JwtTokenService.cs` | Génération des jetons + `JwtOptions`. |
| `Services/LoggingEmailSender.cs` | Envoi de courriel simulé (écrit dans les logs). |
| `Services/Mapper.cs` | Conversions entités → DTO et libellés français des enums. |
| `DependencyInjection.cs` | `AddJobStoreInfrastructure()` : point d'entrée unique du conteneur. |

### 2.4 `JobStore.Api`

- `Program.cs` : configuration (JWT, CORS, Swagger, format d'erreur de validation).
- `Infrastructure/ApiControllerBase.cs` : lecture de l'utilisateur courant depuis le jeton
  (`CurrentUserId`, `RequiredUserId`) et traduction `Result` → réponse HTTP.
- `Controllers/*` : un contrôleur par domaine, protégé par `[Authorize(Roles = "...")]`.

---

## 3. Sécurité

### 3.1 Mots de passe

PBKDF2 (SHA-256, 100 000 itérations, sel aléatoire de 16 octets). Format stocké :
`{itérations}.{selBase64}.{hashBase64}`. La comparaison utilise `FixedTimeEquals`.

### 3.2 Authentification à deux facteurs

Le parcours est identique pour l'inscription, la connexion et le changement de courriel :

```
1. POST /api/auth/login   (ou /register/employee, /register/employer, /change-email)
   → crée un VerificationCode, l'envoie par courriel
   → renvoie { challengeId, email, expiresAtUtc, devCode, message }

2. POST /api/auth/verify  { challengeId, code }
   → consomme le code, applique l'effet (activation, changement d'email…)
   → renvoie { accessToken, expiresAtUtc, user }
```

Garde-fous portés par `VerificationCode.IsUsable` : expiration (10 minutes par défaut),
code déjà consommé, maximum 5 tentatives.

> `devCode` n'est renvoyé que si `Security:ExposeVerificationCode` vaut `true`.
> **Passer ce réglage à `false` en production.**

### 3.3 Jetons

JWT HS256 portant `sub`, `email`, `NameIdentifier`, `Name` et `Role`. Durée de vie 8 heures
(`Security:TokenLifetimeMinutes`). Les rôles alimentent directement `[Authorize(Roles = ...)]`.

### 3.4 Réglages sensibles (`appsettings.json`)

```jsonc
"Security": {
  "JwtSigningKey": "...",          // à remplacer par un secret hors du dépôt en production
  "TokenLifetimeMinutes": 480,
  "ExposeVerificationCode": true,  // false en production
  "DemoVerificationCode": "123456" // vide = code aléatoire à 6 chiffres
}
```

---

## 4. Le moteur de correspondance

`MatchingService.Evaluate(employee, job)` renvoie un pourcentage **et** le détail qui l'explique
(compétences acquises, compétences manquantes). C'est ce détail qui est affiché en infobulle sur
la jauge et sous forme de puces vertes/grises sur le détail de l'offre.

Trois signaux pondérés :

| Poids | Signal |
| --- | --- |
| 70 % | Part des compétences requises couvertes par le profil. Les compétences citées dans les **tâches des expériences** comptent également. |
| 15 % | Proximité géographique : même ville = 1, même pays = 0,6, sinon 0. |
| 15 % | Parcours renseigné : expériences (0,6) + études (0,4). |

Le score est recalculé à chaque affichage pour les recommandations et la recherche, mais il est
**figé au moment du dépôt** dans `JobApplication.MatchPercentage` : l'employeur voit le score tel
qu'il était lors de la candidature.

---

## 5. Lecture automatique des CV

`ResumeParser` extrait le texte selon le format puis applique des expressions régulières et des
listes de mots-clés (compétences, langues, villes, pays).

| Format | Méthode | Fiabilité |
| --- | --- | --- |
| `.txt` | Lecture directe UTF-8 | complète |
| `.docx` | Décompression ZIP puis extraction de `word/document.xml` | bonne |
| `.pdf` | Extraction des segments de texte non compressés | partielle |
| `.doc` | Récupération des chaînes lisibles du binaire | faible |

Le résultat est une **proposition** : le frontend l'affiche dans un encart et l'utilisateur clique
sur « Pré-remplir le formulaire ». Les champs déjà remplis ne sont jamais écrasés.

Pour une extraction PDF complète, remplacer `ResumeParser` par une implémentation basée sur une
bibliothèque dédiée (PdfPig, iText) — l'interface `IResumeParser` ne change pas.

---

## 6. Frontend — principes

- **Standalone** : pas de `NgModule`, chaque composant déclare ses `imports`.
- **Signaux** : l'état des composants est en `signal()` / `computed()`. L'application tourne
  **sans zone.js** (`provideZonelessChangeDetection()`), ce qui impose de passer par des signaux
  pour tout état qui doit déclencher un rendu.
- **Lazy loading** : chaque route utilise `loadComponent`, une page = un chunk.
- **Trois intercepteurs HTTP** : jeton (`authInterceptor`), barre de progression
  (`loadingInterceptor`), messages d'erreur et déconnexion automatique (`errorInterceptor`).
- **Guards** : `authGuard` (connecté), `roleGuard(role)` (rôle précis), `guestGuard`
  (interdit connexion/inscription à un utilisateur déjà connecté).

Détails dans [`frontend.md`](frontend.md).

---

## 7. Ce qui reste à faire pour une mise en production

1. **Persistance** : implémenter `IJobStoreRepository` avec EF Core + Npgsql, écrire les migrations.
   La chaîne de connexion est déjà présente dans `appsettings.json`.
2. **Courriels réels** : remplacer `LoggingEmailSender` par un envoi SMTP / SendGrid, et passer
   `ExposeVerificationCode` à `false`.
3. **Stockage des fichiers** : les CV sont actuellement des `byte[]` en mémoire. Les déplacer vers
   un stockage objet (disque, S3, Azure Blob) et ne conserver que la référence en base.
4. **Secrets** : sortir `JwtSigningKey` du fichier de configuration (variables d'environnement,
   Azure Key Vault, `dotnet user-secrets`).
5. **Jetons de rafraîchissement** : aujourd'hui le jeton expire au bout de 8 heures sans
   renouvellement possible.
6. **Tests** : aucun projet de test n'est présent. Les services métier sont conçus pour être
   testables (dépendances injectées, aucune dépendance statique).
7. **Import d'offres externes** : le statut `JobStatus.External` et le champ `ExternalApplyUrl`
   existent, mais le connecteur d'import reste à écrire.
