# JobStore

Plateforme web de recherche d'emploi (type Indeed / Jobillico) avec trois espaces :
**candidat**, **entreprise** et **administration**.

- Backend : **ASP.NET Core 9** (Domain / Application / Infrastructure / Api), authentification **JWT** + double facteur par courriel.
- Frontend : **Angular 21** standalone, **Angular Material 21** (Material 3), détection de changement **sans zone.js** (signaux).
- Persistance : **en mémoire** pour ce prototype, derrière une interface prête pour EF Core + PostgreSQL.

---

## 1. Démarrage rapide

Deux terminaux, dans cet ordre.

### Terminal 1 — API

```bash
cd backend/JobStore.Api && dotnet run
```

L'API écoute sur `http://localhost:5081`.
Documentation interactive des endpoints : <http://localhost:5081/swagger>.

> Sur cette machine, le SDK .NET utilise un dossier local. Si `dotnet run` échoue avec une
> erreur de permission, préfixer par :
> `$env:DOTNET_CLI_HOME=(Resolve-Path .dotnet-home).Path` (PowerShell, à la racine du dépôt).

### Terminal 2 — Frontend

```bash
cd frontend && npm install && npm start
```

L'application est disponible sur <http://localhost:4200>.

L'URL de l'API est configurée dans [`frontend/src/environments/environment.ts`](frontend/src/environments/environment.ts).

### Analyse des CV par l'IA (clé d'API Claude)

L'analyse et le pré-remplissage du profil à partir d'un CV appellent l'API Claude d'Anthropic.
Sans clé, tout le reste de l'application fonctionne et l'analyse affiche un message explicite.

La clé ne doit **jamais** être écrite dans `appsettings.json` ni dans aucun fichier du dépôt.
En développement, elle est stockée hors du dépôt avec les *user secrets* .NET :

```bash
dotnet user-secrets set "Anthropic:ApiKey" "<votre-cle>" --project backend/JobStore.Api
```

En production, utiliser la variable d'environnement `Anthropic__ApiKey` (ou `ANTHROPIC_API_KEY`).
Le modèle, l'effort et la limite de jetons se règlent dans la section `Anthropic` de `appsettings.json`.

---

## 2. Comptes de démonstration

Le code de vérification à 6 chiffres est **123456** pour tous les comptes en mode développement
(il est aussi affiché à l'écran et écrit dans les logs de l'API).

| Rôle | Courriel | Mot de passe |
| --- | --- | --- |
| Candidat | `alicia@example.com` | `Employee123` |
| Candidat | `marc@example.com` | `Employee123` |
| Entreprise | `rh@nordtalent.ca` | `Employer123` |
| Entreprise | `emploi@santeplus.ca` | `Employer123` |
| Administrateur | `ndele2008@gmail.com` | `Admin1234` |

Les données sont **en mémoire** : chaque redémarrage de l'API remet le jeu de démonstration à zéro.

---

## 3. Fonctionnalités livrées

### Candidat
- Création de compte avec vérification du courriel par code à 6 chiffres
- Connexion en deux étapes (mot de passe puis code)
- Profil complet : informations personnelles, études, expériences, compétences, langues, certifications
- Téléversement de CV (PDF, DOC, DOCX, TXT) et **analyse par l'IA (API Claude)** : les informations
  extraites (identité, études, expériences, compétences, langues, certifications) sont proposées
  dans une fenêtre de revue, puis ajoutées au profil après validation
- Plusieurs CV, choix du CV par défaut, téléchargement, suppression
- Recherche d'offres avec filtres (mot-clé, ville, domaine, secteur, salaire, contrat, mode de travail, tri, pagination)
- Détail d'une offre avec **pourcentage de correspondance expliqué** (compétences acquises / manquantes)
- Candidature avec choix du CV et lettre de présentation (saisie libre ou fichier)
- Suivi des candidatures par statut, retrait d'une candidature non tranchée
- Tableau de bord : résumé du profil, taux de complétion, offres recommandées (3 par page), recherche rapide
- Changement d'adresse courriel (confirmé par code) et de mot de passe

### Entreprise
- Création de compte avec secteurs d'activité multiples et vérification du courriel
- Tableau de bord : offres actives, candidatures, consultations, répartition par statut, tableau de suivi
- Création, modification, changement de statut (brouillon / publiée / fermée) et suppression d'offres
- Détail d'une offre : liste des candidats **classés par correspondance**, profil complet de chaque candidat,
  téléchargement du CV, changement de statut de la candidature (en analyse, présélection, acceptée, refusée)
- Liste des **utilisateurs ayant consulté** l'offre, avec le nombre de consultations et l'indication
  « a postulé ou non »
- Profil de l'entreprise

### Administration
- Vue d'ensemble : nombre de candidats, entreprises, offres, candidatures, consultations
- Listes des comptes candidats, entreprises et administrateurs
- Activation / désactivation d'un compte (bloque la connexion)

Le détail fonctionnel écran par écran est dans [`docs/fonctionnalites.md`](docs/fonctionnalites.md).

---

## 4. Documentation

| Document | Contenu |
| --- | --- |
| [`docs/architecture.md`](docs/architecture.md) | Architecture, couches, flux de données, choix techniques |
| [`docs/api.md`](docs/api.md) | Référence complète des endpoints REST |
| [`docs/frontend.md`](docs/frontend.md) | Structure Angular, conventions, composants partagés |
| [`docs/fonctionnalites.md`](docs/fonctionnalites.md) | Fonctionnalités écran par écran |
| [`docs/maintenance.md`](docs/maintenance.md) | Guide de maintenance : ajouter un champ, un endpoint, une page, migrer vers PostgreSQL |

---

## 5. Structure du dépôt

```
JobStore/
├─ backend/
│  ├─ JobStore.Domain/          entités et enums, sans dépendance
│  ├─ JobStore.Application/     DTOs et interfaces des services
│  ├─ JobStore.Infrastructure/  implémentations : dépôt en mémoire, services métier, JWT, analyse CV (Claude)
│  └─ JobStore.Api/             contrôleurs REST, configuration, Swagger
├─ frontend/
│  └─ src/app/
│     ├─ core/       modèles, services HTTP, intercepteurs, guards, utilitaires
│     ├─ shared/     composants et pipes réutilisables
│     ├─ layout/     ossature (barre, menu mobile, pied de page)
│     └─ features/   une page par écran (home, auth, jobs, employee, employer, admin)
└─ docs/
```
