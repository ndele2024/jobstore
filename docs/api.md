# Référence de l'API JobStore

Base : `http://localhost:5081/api` — documentation interactive : <http://localhost:5081/swagger>

## Conventions

- **Authentification** : en-tête `Authorization: Bearer <accessToken>`.
- **Erreurs** : toujours le même corps, que l'erreur vienne de la validation ou du métier.

  ```json
  { "message": "Vous avez deja postule a cette offre.", "statusCode": 409 }
  ```

  Pour une erreur de validation, un champ `errors` est ajouté (`{ "Email": ["..."] }`).
  Le frontend lit systématiquement `message` (voir `extractMessage` dans `error.interceptor.ts`).
- **Enums** : transmis en **nombres** (voir le tableau en fin de document).
- **Dates seules** (`startDate`, `displayUntil`, `issueDate`…) : chaîne `"AAAA-MM-JJ"`.
- **Dates complètes** (`submittedAtUtc`, `createdAtUtc`…) : ISO 8601 UTC.

---

## 1. Authentification — `/api/auth`

| Méthode | Chemin | Accès | Description |
| --- | --- | --- | --- |
| POST | `/register/employee` | public | Crée un compte candidat et envoie le code de vérification |
| POST | `/register/employer` | public | Crée un compte entreprise et envoie le code |
| POST | `/login` | public | Étape 1 : vérifie le mot de passe, envoie le code |
| POST | `/verify` | public | Étape 2 : confirme le code, renvoie le jeton JWT |
| POST | `/resend-code` | public | Renvoie un nouveau code pour un défi existant |
| GET | `/me` | connecté | Identité de l'utilisateur courant |
| POST | `/change-email` | connecté | Demande de changement de courriel (confirmée par code) |
| POST | `/change-password` | connecté | Change le mot de passe |

**`POST /login`**

```json
{ "email": "alicia@example.com", "password": "Employee123" }
```

Réponse `200` :

```json
{
  "challengeId": "1b72d5bd-c0e7-49e0-81cc-5be5cd2356d4",
  "email": "alicia@example.com",
  "expiresAtUtc": "2026-09-08T18:25:24Z",
  "devCode": "123456",
  "message": "Un code de verification a ete envoye a votre adresse courriel."
}
```

`devCode` n'est présent qu'en développement (`Security:ExposeVerificationCode`).

**`POST /verify`**

```json
{ "challengeId": "1b72d5bd-...", "code": "123456" }
```

Réponse `200` :

```json
{
  "accessToken": "eyJhbGciOi...",
  "expiresAtUtc": "2026-09-09T02:25:24Z",
  "user": {
    "id": "33333333-3333-3333-3333-333333333333",
    "role": 1,
    "displayName": "Alicia Kouame",
    "email": "alicia@example.com",
    "firstName": "Alicia",
    "lastName": "Kouame",
    "companyName": "",
    "emailVerified": true
  }
}
```

Codes d'erreur : `401` mot de passe ou code invalide, `403` compte désactivé,
`409` courriel déjà utilisé, `410` code expiré ou déjà consommé.

---

## 2. Offres publiques — `/api/jobs`

| Méthode | Chemin | Accès | Description |
| --- | --- | --- | --- |
| GET | `/` | public | Recherche paginée |
| GET | `/{jobId}` | public | Détail d'une offre |
| POST | `/{jobId}/apply` | candidat | Dépôt d'une candidature |

**`GET /api/jobs`** — paramètres de requête (tous facultatifs) :

| Paramètre | Type | Note |
| --- | --- | --- |
| `keyword` | string | titre, description, entreprise ou compétence |
| `domain`, `city`, `country`, `sector` | string | correspondance partielle, insensible à la casse |
| `minimumSalary` | number | filtre sur `salaryMax >= valeur` |
| `contractType`, `workMode` | number | voir le tableau des enums |
| `sortBy` | string | `recent` (défaut), `deadline`, `salary`, `match`, `title` |
| `page`, `pageSize` | number | défaut 1 et 10, `pageSize` plafonné à 100 |

Réponse : `{ items: JobCard[], totalCount, page, pageSize }`.

Si l'appelant est un **candidat connecté**, chaque `JobCard` porte son `matchPercentage` ;
sinon ce champ vaut `null`.

**`GET /api/jobs/{jobId}`** — renvoie aussi `matchPercentage`, `matchedSkills`, `missingSkills`
et `hasApplied` pour un candidat connecté. **Effet de bord voulu** : la consultation par un
candidat connecté est enregistrée (statistiques employeur), même s'il ne postule pas.

**`POST /api/jobs/{jobId}/apply`**

```json
{ "resumeId": "6666...", "coverLetter": "…", "coverLetterFileName": "lettre.pdf" }
```

Refus : `409` si déjà postulé, si l'offre est expirée, ou si l'offre est externe.

---

## 3. Profil candidat — `/api/profile` *(rôle `Employee`)*

| Méthode | Chemin | Description |
| --- | --- | --- |
| GET | `/` | Profil complet (+ `completionPercentage`) |
| PUT | `/personal-info` | Informations personnelles |
| PUT | `/skills` | Remplace la liste des compétences (`{ "skills": [...] }`) |
| POST / PUT / DELETE | `/educations`, `/educations/{id}` | Formations |
| POST / PUT / DELETE | `/experiences`, `/experiences/{id}` | Expériences |
| POST / PUT / DELETE | `/languages`, `/languages/{id}` | Langues |
| POST / PUT / DELETE | `/certifications`, `/certifications/{id}` | Certifications |
| GET | `/resumes` | Liste des CV |
| POST | `/resumes` | Téléverse un CV (`multipart/form-data`, champ `file`) |
| PUT | `/resumes/{id}/default` | Définit le CV par défaut |
| DELETE | `/resumes/{id}` | Supprime un CV |
| GET | `/resumes/{id}/download` | Télécharge le fichier |

**Règles métier**

- Formation : date de fin obligatoire sauf si `isCurrent` ; date d'obtention prévue obligatoire
  si `diplomaObtained` est faux ; la date de fin ne peut pas précéder la date de début.
- Expérience : même règle sur `isCurrent` et l'ordre des dates.
- CV : formats `.pdf`, `.doc`, `.docx`, `.txt`, 5 Mo maximum (`415` / `413` sinon).
  Un CV rattaché à une candidature ne peut pas être supprimé (`409`).

**`POST /api/profile/resumes`** renvoie le document **et** la lecture automatique :

```json
{
  "resume": { "id": "...", "fileName": "cv.pdf", "sizeInBytes": 45123, "isDefault": false },
  "parsed": {
    "firstName": "Alicia", "lastName": "Kouame",
    "email": "alicia@example.com", "phone": "+1 438 555-1000",
    "city": "Laval", "country": "Canada",
    "skills": ["Angular", "ASP.NET"], "languages": ["Francais", "Anglais"],
    "rawTextPreview": "…", "supported": true,
    "message": "Lecture automatique terminee. Verifiez et corrigez les champs proposes."
  }
}
```

---

## 4. Espace candidat — `/api/employee` *(rôle `Employee`)*

| Méthode | Chemin | Description |
| --- | --- | --- |
| GET | `/dashboard` | Résumé du profil, recommandations, compteurs |
| GET | `/applications?status={n}` | Candidatures, filtrables par statut |
| DELETE | `/applications/{id}` | Retire une candidature |

Le retrait est refusé (`409`) si la candidature est déjà `Accepted` ou `Rejected`.

---

## 5. Espace entreprise — `/api/employer` *(rôle `Employer`)*

| Méthode | Chemin | Description |
| --- | --- | --- |
| GET / PUT | `/profile` | Profil de l'entreprise |
| GET | `/dashboard` | Indicateurs et suivi des offres |
| GET | `/jobs?status={n}` | Offres de l'entreprise (brouillons inclus) |
| GET | `/jobs/{jobId}` | Détail + **candidats** + **visiteurs** |
| POST | `/jobs` | Crée une offre |
| PUT | `/jobs/{jobId}` | Modifie une offre |
| PATCH | `/jobs/{jobId}/status` | Change le statut (`{ "status": 2 }`) |
| DELETE | `/jobs/{jobId}` | Supprime l'offre |
| PATCH | `/applications/{applicationId}/status` | Change le statut d'une candidature |
| GET | `/candidates/{candidateId}/resumes/{resumeId}` | Télécharge le CV d'un candidat |

**Règles métier**

- Une offre n'est modifiable que par l'entreprise propriétaire (`403` sinon) ; les offres
  importées (`isExternal`) ne sont pas modifiables.
- `salaryMax >= salaryMin`, `displayUntil` dans le futur, description d'au moins 30 caractères.
- **Suppression** : si l'offre a des candidatures elle est archivée (`Deleted`) pour conserver
  l'historique ; sinon elle est réellement retirée.
- Le téléchargement d'un CV n'est autorisé que si le candidat a postulé à une offre de
  l'entreprise appelante (`403` sinon).

**`GET /api/employer/jobs/{jobId}`** renvoie :

```json
{
  "job":        { /* JobDetails */ },
  "applicants": [ { "candidateName": "...", "matchPercentage": 100,
                    "matchedSkills": [...], "missingSkills": [...],
                    "skills": [...], "languages": [...], "educations": [...],
                    "experiences": [...], "certifications": [...],
                    "resumeId": "...", "coverLetter": "...", "status": 2 } ],
  "viewers":    [ { "displayName": "...", "viewCount": 3, "hasApplied": true,
                    "lastViewedAtUtc": "..." } ]
}
```

Les candidats sont triés par correspondance décroissante.

---

## 6. Administration — `/api/admin` *(rôle `Admin`)*

| Méthode | Chemin | Description |
| --- | --- | --- |
| GET | `/dashboard` | Compteurs globaux |
| GET | `/users/employees` | Liste des candidats |
| GET | `/users/employers` | Liste des entreprises |
| GET | `/users/admins` | Liste des administrateurs |
| PATCH | `/users/{userId}/activation?isActive=true\|false` | Active / désactive un compte |

Un compte administrateur ne peut pas être désactivé par cette route (`409`).

---

## 7. Données de référence — `/api/reference-data`

`GET /api/reference-data` (public) alimente toutes les listes déroulantes du frontend :

```json
{
  "domains": [...], "sectors": [...], "cities": [...], "countries": [...],
  "diplomas": [...], "languages": [...], "skills": [...],
  "languageLevels":     [ { "value": 1, "name": "Beginner", "label": "Debutant" } ],
  "contractTypes":      [ ... ], "workModes": [ ... ],
  "jobStatuses":        [ ... ], "applicationStatuses": [ ... ]
}
```

Les listes statiques sont complétées par les valeurs réellement présentes en base
(un domaine saisi librement par une entreprise apparaît ensuite dans les filtres).

---

## 8. Valeurs des enums

| Enum | Valeurs |
| --- | --- |
| `UserRole` | 1 Employee · 2 Employer · 3 Admin |
| `JobStatus` | 1 Draft · 2 Published · 3 Closed · 4 Deleted · 5 External |
| `ApplicationStatus` | 1 Submitted · 2 InReview · 3 Shortlisted · 4 Rejected · 5 Accepted |
| `LanguageLevel` | 1 Beginner · 2 Intermediate · 3 Advanced · 4 Fluent · 5 Native |
| `ContractType` | 1 FullTime · 2 PartTime · 3 Contract · 4 Internship · 5 Freelance |
| `WorkMode` | 1 OnSite · 2 Hybrid · 3 Remote |
| `VerificationPurpose` | 1 Registration · 2 Login · 3 EmailChange · 4 PasswordReset |

Source : `backend/JobStore.Domain/Enums/Enums.cs` et
`frontend/src/app/core/models/api.models.ts` — **garder les deux fichiers alignés**.
