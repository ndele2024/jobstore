# Fonctionnalités, écran par écran

Chaque section indique le fichier de la page, ce que l'écran fait et les endpoints appelés.

---

## 1. Espace public

### 1.1 Accueil — `/`
`features/home/home-page.*`

- Proposition de valeur et recherche rapide (mot-clé + ville) qui redirige vers `/emplois`.
- Trois arguments produit, six dernières offres publiées, compteur d'offres disponibles.
- Boutons contextuels : « Je cherche un emploi » / « Je recrute » pour un visiteur,
  « Aller à mon tableau de bord » pour un utilisateur connecté.

`GET /api/jobs?page=1&pageSize=6&sortBy=recent`

### 1.2 Recherche d'offres — `/emplois`
`features/jobs/job-search-page.*`

- Barre principale : mot-clé + ville. Panneau « Filtres avancés » : domaine, secteur, salaire
  minimum, type de contrat, mode de travail, tri.
- Tris disponibles : plus récentes, fin d'affichage proche, salaire décroissant, titre,
  et **meilleure correspondance** (réservé aux candidats connectés).
- Résultats en cartes compactes : titre, entreprise, ville, fourchette de salaire, contrat,
  mode de travail, domaine, jours restants, et jauge de correspondance pour un candidat connecté.
- Pagination Material (10 / 20 / 50 par page).
- **Les critères sont écrits dans l'URL** : une recherche est partageable et survit à un
  rafraîchissement ou à un retour arrière.

`GET /api/jobs` · `GET /api/reference-data`

### 1.3 Détail d'une offre — `/emplois/:id`
`features/jobs/job-details-page.*`

- Description, responsabilités, compétences recherchées.
  Pour un candidat connecté : jauge de correspondance en grand format, compétences **acquises**
  en vert avec une coche et compétences **manquantes** en gris.
- Colonne latérale : salaire, date d'entrée en poste, fin d'affichage, nombre de consultations,
  nombre de candidatures, et le bouton d'action.
- Le bouton s'adapte à la situation : postuler · « vous avez déjà postulé » · offre expirée ·
  « seuls les comptes candidat peuvent postuler » · redirection vers le site partenaire pour une
  offre importée · invitation à se connecter pour un visiteur.
- **La consultation est enregistrée** pour les statistiques de l'employeur, même sans candidature.

`GET /api/jobs/{id}`

---

## 2. Authentification

### 2.1 Connexion — `/connexion`
`features/auth/login-page.*` · étape 1 sur 2

Courriel + mot de passe → l'API envoie un code à 6 chiffres → redirection vers `/verification`.
Le paramètre `?redirect=` est conservé : après connexion, l'utilisateur revient sur la page
qu'il voulait consulter. Les comptes de démonstration sont rappelés en bas de l'écran.

`POST /api/auth/login`

### 2.2 Choix du type de compte — `/inscription`
`features/auth/register-choice-page.ts` — deux cartes : candidat ou entreprise.

### 2.3 Inscription candidat — `/inscription/candidat`
`features/auth/register-employee-page.*`

Nom, prénom, courriel, téléphone, adresse, ville, pays, code postal, mot de passe et
confirmation. Validation avant envoi : format du courriel et du téléphone, mot de passe d'au
moins 8 caractères avec une lettre et un chiffre, confirmation identique.

`POST /api/auth/register/employee`

### 2.4 Inscription entreprise — `/inscription/entreprise`
`features/auth/register-employer-page.*`

Nom de l'entreprise, courriel, téléphone, adresse, **ville et pays obligatoires**, code postal,
site web, **secteurs d'activité multiples** (puces avec autocomplétion), mot de passe et
confirmation.

`POST /api/auth/register/employer`

### 2.5 Vérification du code — `/verification`
`features/auth/verify-code-page.*` · étape 2 sur 2

Écran commun à l'inscription, à la connexion et au changement de courriel. Champ à 6 chiffres,
renvoi du code, annulation. En développement, le code est affiché dans un encart d'information.
Après succès, redirection vers le tableau de bord du rôle (ou vers la page demandée initialement).

`POST /api/auth/verify` · `POST /api/auth/resend-code`

### 2.6 Paramètres du compte — `/mon-compte`
`features/auth/account-settings-page.*` — tous rôles

- Changement d'adresse courriel : demande le mot de passe actuel, puis un code est envoyé à la
  **nouvelle** adresse et doit être confirmé.
- Changement de mot de passe : mot de passe actuel, nouveau, confirmation.

`POST /api/auth/change-email` · `POST /api/auth/change-password`

---

## 3. Espace candidat

### 3.1 Tableau de bord — `/candidat/tableau-de-bord`
`features/employee/employee-dashboard-page.*`

- Recherche rapide d'offres.
- Quatre indicateurs : candidatures, offres consultées, CV enregistrés, taux de complétion.
- **Offres recommandées : 3 à la fois**, avec flèches de navigation quand il y en a davantage
  (jusqu'à 9). Chaque carte affiche la jauge, la fourchette de salaire et les compétences
  restant à développer. Les offres déjà postulées sont exclues.
- Candidatures récentes avec leur statut.
- Colonne latérale : titre professionnel, localisation, barre de complétion, sections manquantes
  en puces orange, compétences, bouton « Modifier mon profil », répartition des candidatures.

`GET /api/employee/dashboard`

### 3.2 Mon profil — `/candidat/profil`
`features/employee/profile/profile-page.*` — six onglets

| Onglet | Contenu |
| --- | --- |
| **Informations** | Nom, prénom, téléphone, adresse, ville, pays, code postal, titre professionnel, présentation. Le courriel est en lecture seule (modifiable dans « Paramètres du compte »). |
| **CV** | Zone de téléversement, liste des CV avec taille, badge « CV par défaut », actions : analyser et pré-remplir (✨), définir par défaut, télécharger, supprimer. |
| **Études** | Liste des formations, ajout / modification / suppression par boîte de dialogue. |
| **Expériences** | Liste des expériences avec leurs tâches. |
| **Compétences et langues** | Compétences en puces avec autocomplétion ; langues avec niveau. |
| **Certifications** | Nom, organisme, dates d'obtention et d'expiration, numéro. |

**Analyse du CV par l'IA et pré-remplissage** (`resume-analysis-dialog.*`)

1. Après un téléversement, un encart propose « Analyser et pré-remplir » (ou « Plus tard »).
   Tout CV déjà enregistré peut aussi être analysé avec le bouton ✨.
2. Un bandeau indique l'analyse en cours (10 à 60 secondes). Le CV est lu par l'API Claude.
3. Une fenêtre de revue présente ce qui a été trouvé, section par section. Les informations
   absentes du CV ne sont pas proposées. Le candidat coche ce qu'il reprend :
   - champs personnels différents du profil — cochés seulement si le champ du profil est vide,
     l'ancienne valeur étant affichée barrée ;
   - nouvelles compétences uniquement, avec « Tout cocher / Tout décocher » ;
   - études, expériences, langues, certifications — décochées si déjà présentes
     (« déjà dans votre profil »), marquées « à compléter » s'il manque un champ obligatoire.
4. « Ajouter à mon profil » enregistre les éléments complets, puis ouvre **un par un** les
   formulaires des éléments incomplets, pré-remplis, champs manquants vides. Annuler un formulaire
   passe simplement à l'élément suivant.
5. Un message récapitule le nombre d'éléments ajoutés. Si un champ personnel obligatoire manque
   à la fois dans le CV et dans le profil, les valeurs sont recopiées dans l'onglet
   « Informations » pour que le candidat complète et enregistre.

Sans clé d'API configurée côté serveur, l'analyse affiche un message explicite ; le remplissage
manuel reste toujours possible.

Boîtes de dialogue : `education-dialog`, `experience-dialog`, `language-dialog`,
`certification-dialog` (toutes acceptent des valeurs de départ `draft`) et `resume-analysis-dialog`.

Règles de saisie appliquées côté formulaire **et** côté API :
- « Études en cours » ⇒ pas de date de fin ; sinon la date de fin est obligatoire.
- « Diplôme obtenu » décoché ⇒ date d'obtention prévue obligatoire.
- « Emploi en cours » ⇒ pas de date de fin.
- La date de fin ne peut pas précéder la date de début.

`GET/PUT /api/profile*`

### 3.3 Mes candidatures — `/candidat/candidatures`
`features/employee/applications-page.*`

Filtres par statut (toutes, soumises, en analyse, présélectionnées, acceptées, refusées).
Chaque ligne : jauge de correspondance, titre cliquable, entreprise, ville, CV utilisé, date de
dépôt, extrait de la lettre, puce de statut, et bouton « Retirer » (avec confirmation) tant que
la candidature n'est ni acceptée ni refusée.

`GET /api/employee/applications` · `DELETE /api/employee/applications/{id}`

### 3.4 Postuler
`features/jobs/apply-dialog.component.*`

1. Choix du CV parmi ceux du profil (le CV par défaut est présélectionné) ou **téléversement
   d'un nouveau CV** directement depuis la boîte de dialogue.
2. Lettre de présentation : onglet « Rédiger » (texte libre, 5 000 caractères) ou onglet
   « Téléverser un fichier » (PDF, DOC, DOCX, TXT). Le contenu d'un `.txt` est repris
   automatiquement dans le champ de saisie.

`POST /api/profile/resumes` · `POST /api/jobs/{id}/apply`

---

## 4. Espace entreprise

### 4.1 Tableau de bord — `/entreprise/tableau-de-bord`
`features/employer/employer-dashboard-page.*`

Nom et secteurs de l'entreprise, quatre indicateurs (offres publiées avec le détail
brouillons/fermées, candidatures dont celles à traiter, consultations, total des offres),
répartition des candidatures par statut, et **tableau de suivi des offres** : statut, vues,
candidatures (avec un badge « +n » pour les non traitées), meilleur profil, fin d'affichage.

`GET /api/employer/dashboard`

### 4.2 Mes offres — `/entreprise/offres`
`features/employer/employer-jobs-page.*`

Filtres par statut. Chaque offre : titre, statut, ville, salaire, contrat, mode de travail,
domaine/secteur, fin d'affichage. Actions : voir les candidats, modifier, et un menu
« publier / repasser en brouillon / fermer / supprimer ». La suppression demande confirmation et
précise que l'offre est archivée si des candidatures existent.

`GET /api/employer/jobs` · `PATCH .../status` · `DELETE .../{id}`

### 4.3 Créer ou modifier une offre — `/entreprise/offres/nouvelle` et `/:id/modifier`
`features/employer/job-form-page.*` — une seule page pour les deux cas

Sections : poste (titre, domaine, secteur, ville, pays, contrat, mode de travail),
rémunération et dates (salaire min/max, entrée en poste, fin d'affichage), contenu
(description d'au moins 30 caractères, compétences requises, responsabilités), publication (statut).

Trois boutons : annuler, **enregistrer en brouillon**, **publier**.
Validations : salaire maximum ≥ minimum, fin d'affichage dans le futur, description suffisante.

`POST /api/employer/jobs` · `PUT /api/employer/jobs/{id}`

### 4.4 Suivi d'une offre — `/entreprise/offres/:id`
`features/employer/employer-job-details-page.*` — **écran central côté entreprise**

En-tête : titre, statut, localisation, salaire, contrat, dates, puis quatre compteurs
(consultations, visiteurs uniques, candidatures, à traiter). Boutons « Modifier » et
« Changer le statut ».

**Onglet Candidats** — accordéon trié par correspondance décroissante. En-tête : jauge, nom,
titre professionnel, ville, date de dépôt, statut. Une fois déplié :

- coordonnées (courriel, téléphone) ;
- détail de la correspondance : compétences acquises en vert, manquantes en gris ;
- compétences déclarées, expériences avec leurs tâches, études, langues, certifications ;
- lettre de présentation ;
- actions : **télécharger le CV**, mettre en analyse, présélectionner, accepter, refuser.

**Onglet Consultations** — tableau des utilisateurs ayant ouvert l'offre : nom, localisation,
nombre de consultations, indicateur « a postulé oui/non », dernière visite.

`GET /api/employer/jobs/{id}` · `PATCH /api/employer/applications/{id}/status` ·
`GET /api/employer/candidates/{candidateId}/resumes/{resumeId}`

### 4.5 Profil de l'entreprise — `/entreprise/profil`
`features/employer/company-profile-page.*`

Nom, téléphone, adresse, ville, pays, code postal, site web, secteurs d'activité, accroche et
présentation. Le changement de nom d'entreprise est **répercuté sur toutes ses offres**.

`GET/PUT /api/employer/profile`

---

## 5. Administration — `/administration`
`features/admin/admin-page.*`

Quatre compteurs globaux (candidats, entreprises, offres avec le détail publiées/externes,
candidatures avec le nombre de consultations), puis trois onglets :

- **Candidats** : nom, contact, localisation, nombre de candidatures, état du courriel,
  date d'inscription, interrupteur d'activation.
- **Entreprises** : mêmes colonnes, avec le nombre d'offres.
- **Administrateurs** : liste en lecture seule.

Désactiver un compte bloque sa connexion (message explicite à la tentative suivante).

`GET /api/admin/dashboard` · `GET /api/admin/users/*` ·
`PATCH /api/admin/users/{id}/activation`

---

## 6. Transversal

| Élément | Comportement |
| --- | --- |
| Navigation | Barre supérieure adaptée au rôle ; en dessous de 960 px, tiroir latéral avec bouton hamburger. |
| Chargement | Barre de progression sous la barre supérieure dès qu'une requête HTTP est en cours. |
| Messages | Snackbars en haut de l'écran : vert (succès), rouge (erreur), bleu (information). |
| Erreurs | Message traduit et lisible ; sur `401` en session active, déconnexion et retour à la connexion. |
| Session | Jeton et utilisateur conservés dans `localStorage` : le rafraîchissement ne déconnecte pas. |
| Suppressions | Toujours précédées d'une boîte de confirmation. |
| Listes vides | Composant `EmptyStateComponent` avec une action utile (« Voir les offres », « Compléter mon profil »…). |
| Accessibilité | Libellés `aria-label` sur les boutons icônes, `role="alert"` sur les blocs d'erreur, navigation au clavier native de Material. |
