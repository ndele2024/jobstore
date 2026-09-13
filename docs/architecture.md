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
  `ITokenService`, `IEmailSender`, `IResumeAnalyzer`, `IMatchingService`).
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
| `Services/ClaudeResumeAnalyzer.cs` | Analyse d'un CV par l'API Claude + `AnthropicOptions`. |
| `Services/ResumeExtractionPrompt.cs` | Consigne et schéma JSON de l'extraction. |
| `Services/ResumeTextExtractor.cs` | Texte brut des DOCX, DOC et TXT (les PDF sont envoyés tels quels). |
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

## 5. Analyse des CV par l'API Claude

### 5.1 Parcours

```
Téléversement            POST /api/profile/resumes            → le fichier est stocké, rien d'autre
      │
Proposition « Analyser et pré-remplir » (ou bouton ✨ sur un CV existant)
      │
Analyse                  POST /api/profile/resumes/{id}/analyze
      │                    ProfileService copie le fichier sous verrou,
      │                    puis ClaudeResumeAnalyzer appelle l'API hors verrou (10 à 60 s)
      ▼
Revue                    ResumeAnalysisDialog : le candidat coche ce qu'il reprend
      │
Enregistrement           éléments complets → enregistrés directement
                         éléments incomplets → ouverts un par un dans leur formulaire pré-rempli
```

**Rien n'est enregistré sans validation du candidat.** L'endpoint d'analyse est en lecture seule.

### 5.2 Appel à l'API

`Services/ClaudeResumeAnalyzer.cs` utilise le SDK officiel `Anthropic` (NuGet) :

| Élément | Valeur |
| --- | --- |
| Modèle | `claude-opus-5` (configurable : `Anthropic:Model`) |
| Effort | `medium` (configurable : `Anthropic:Effort`) — suffisant pour de l'extraction |
| Format de sortie | **Sorties structurées** (`output_config.format` = `json_schema`) : la réponse est garantie conforme au schéma, aucun JSON à « réparer » |
| PDF | envoyé tel quel en bloc `document` base64 — Claude lit colonnes, tableaux et mise en page |
| DOCX / DOC / TXT | texte extrait par `ResumeTextExtractor`, envoyé en bloc `document` texte |
| Refus | repli automatique côté serveur (`fallbacks: "default"`, bêta `server-side-fallback-2026-07-01`) ; si le refus persiste, message explicite |

La consigne et le schéma sont dans `Services/ResumeExtractionPrompt.cs`. Règles clés de la consigne :
n'utiliser que ce qui figure dans le CV, ne rien inventer, dates au format `AAAA-MM-JJ`,
correspondance des niveaux de langue, et traitement du CV comme une donnée (toute consigne qu'il
contiendrait est ignorée).

**Information absente.** Les sorties structurées acceptent au plus **16 paramètres à type union**
(`anyOf`, « X ou null ») dans tout le schéma ; au-delà, l'API refuse la requête avant de lire le CV.
Le schéma n'exprime donc pas l'absence par `null` mais par une **chaîne vide** (textes et dates),
`"inconnu"` (diplôme obtenu) ou `"non precise"` (niveau de langue). Seuls `accumulatedCredits` et
`gpa` restent « nombre ou null » (2 unions). `ClaudeResumeAnalyzer` reconvertit ces valeurs en `null` :
l'API JobStore et le frontend ne voient que des `null`.

Les dates sont revalidées côté serveur (`DateOnly.TryParseExact`) : une date vide ou mal formée
devient `null` et le champ reste à compléter dans le formulaire.

Mesure réelle (Claude Opus 5, effort `medium`) : environ **9 secondes** et **2 700 à 4 700 jetons
en entrée / 150 à 800 en sortie** par CV d'une page, soit quelques centimes par analyse.

### 5.3 Erreurs

| Situation | Code | Message affiché |
| --- | --- | --- |
| Clé d'API absente | 503 | analyse non configurée sur le serveur |
| Fichier illisible (DOCX corrompu, DOC sans texte) | 422 | réessayer avec un PDF ou un DOCX |
| Limite de débit Anthropic | 429 | réessayer dans une minute |
| Document refusé par l'API (PDF invalide, protégé, trop long) | 422 | document illisible, protégé ou trop volumineux |
| Requête refusée pour une autre raison (schéma, paramètre) | 500 | erreur de configuration du serveur ; le message exact d'Anthropic est dans les journaux |
| Refus du modèle / sortie tronquée | 422 | compléter le profil manuellement |
| Panne réseau ou erreur serveur Anthropic | 503 | service momentanément indisponible |

Chaque appel est journalisé avec la durée, le modèle réellement utilisé, le motif d'arrêt et le
nombre de jetons — **jamais le contenu du CV** (donnée personnelle).

### 5.4 Revue côté frontend

`features/employee/profile/resume-analysis-dialog.*` et `resume-analysis.utils.ts`.

Choix par défaut, pensés pour ne rien écraser sans accord :
- un champ personnel n'est proposé que s'il diffère du profil ; il est **coché seulement si le
  profil est vide** pour ce champ (sinon l'ancienne valeur est affichée barrée) ;
- seules les **nouvelles** compétences sont proposées ;
- un élément déjà présent (même établissement + diplôme, même poste + entreprise, même langue,
  même certification) est **décoché** et marqué « déjà dans votre profil » ;
- un élément auquel il manque un champ obligatoire est marqué « à compléter » : s'il est retenu,
  son formulaire s'ouvre pré-rempli, les champs manquants vides.

Le courriel extrait n'est pas proposé : changer d'adresse passe par la vérification par code.

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
