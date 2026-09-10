# Frontend Angular — structure et conventions

Angular **21.2** standalone · Angular Material **21.2** (Material 3) · TypeScript strict ·
détection de changement **sans zone.js**.

---

## 1. Arborescence

```
frontend/src/
├─ index.html                  polices Google (Plus Jakarta Sans, Inter, Material Symbols)
├─ main.ts                     bootstrapApplication(App, appConfig)
├─ styles.scss                 thème Material + jetons de design + classes utilitaires
├─ environments/environment.ts URL de l'API
└─ app/
   ├─ app.ts                   composant racine (délègue à MainLayout)
   ├─ app.config.ts            providers : routeur, HTTP, intercepteurs, locale fr-CA, Material
   ├─ app.routes.ts            table de routage, tout en lazy loading
   │
   ├─ core/                    code technique, sans interface graphique
   │  ├─ models/api.models.ts  interfaces et enums miroirs des DTO C#
   │  ├─ services/             un service HTTP par domaine + notifications + flux de vérification
   │  ├─ interceptors/         auth, loading, error
   │  ├─ guards/auth.guards.ts authGuard, roleGuard(role), guestGuard
   │  └─ utils/                validateurs de formulaire, libellés, helpers de dates
   │
   ├─ shared/                  briques réutilisables
   │  ├─ components/           status-chip, match-gauge, job-card, empty-state,
   │  │                        confirm-dialog, chip-list-input
   │  └─ pipes/labels.pipes.ts libellés d'enums, salaire, taille de fichier, date relative
   │
   ├─ layout/main-layout.*     barre supérieure, tiroir mobile, barre de progression, pied de page
   │
   └─ features/                une page par écran
      ├─ home/
      ├─ auth/                 login, choix d'inscription, inscription ×2, code, paramètres
      ├─ jobs/                 recherche, détail, boîte de dialogue de candidature
      ├─ employee/             tableau de bord, candidatures, profile/ (page + 4 dialogues)
      ├─ employer/             tableau de bord, offres, formulaire, suivi, profil entreprise
      └─ admin/
```

---

## 2. Routes

| Chemin | Écran | Protection |
| --- | --- | --- |
| `/` | Accueil | — |
| `/emplois` | Recherche d'offres | — |
| `/emplois/:id` | Détail d'une offre | — |
| `/connexion` | Connexion (étape 1) | `guestGuard` |
| `/inscription` | Choix du type de compte | `guestGuard` |
| `/inscription/candidat` | Inscription candidat | `guestGuard` |
| `/inscription/entreprise` | Inscription entreprise | `guestGuard` |
| `/verification` | Saisie du code à 6 chiffres | — |
| `/mon-compte` | Courriel et mot de passe | `authGuard` |
| `/candidat/tableau-de-bord` | Tableau de bord candidat | `roleGuard(Employee)` |
| `/candidat/profil` | Profil (6 onglets) | `roleGuard(Employee)` |
| `/candidat/candidatures` | Mes candidatures | `roleGuard(Employee)` |
| `/entreprise/tableau-de-bord` | Cockpit entreprise | `roleGuard(Employer)` |
| `/entreprise/offres` | Liste des offres | `roleGuard(Employer)` |
| `/entreprise/offres/nouvelle` | Création d'offre | `roleGuard(Employer)` |
| `/entreprise/offres/:id` | Candidats et consultations | `roleGuard(Employer)` |
| `/entreprise/offres/:id/modifier` | Modification d'offre | `roleGuard(Employer)` |
| `/entreprise/profil` | Profil de l'entreprise | `roleGuard(Employer)` |
| `/administration` | Administration | `roleGuard(Admin)` |

`withComponentInputBinding()` est activé : un paramètre de route arrive directement en `input()`
dans le composant (`readonly id = input.required<string>()`), sans injecter `ActivatedRoute`.
Ces entrées ne sont lisibles **qu'à partir de `ngOnInit`**, pas dans le constructeur.

---

## 3. Conventions de composant

Modèle suivi par toutes les pages :

```ts
@Component({
  selector: 'app-employer-jobs-page',
  changeDetection: ChangeDetectionStrategy.OnPush,   // systématique
  imports: [ /* uniquement ce que le gabarit utilise */ ],
  templateUrl: './employer-jobs-page.html',
  styleUrl: './employer-jobs-page.scss',
})
export class EmployerJobsPage {
  private readonly employerService = inject(EmployerService);   // inject(), pas de constructeur

  readonly jobs = signal<JobCard[]>([]);        // état -> signal
  readonly loading = signal(true);
  readonly visible = computed(() => /* dérivé */);
}
```

Règles à respecter :

1. **`ChangeDetectionStrategy.OnPush` partout.** L'application tourne sans zone.js : un champ
   ordinaire modifié dans une souscription ne redessine pas la vue. Tout état affiché doit être
   un `signal`.
2. **`inject()`** plutôt que l'injection par constructeur.
3. Gabarits en **fichiers séparés** (`.html`/`.scss`) sauf pour les très petits composants
   partagés, où le gabarit inline reste plus lisible.
4. Syntaxe de contrôle moderne : `@if`, `@for (… ; track …)`, `@else`. Pas de `*ngIf` / `*ngFor`.
5. Les composants partagés utilisent `input()` / `model()`, pas `@Input()`.

---

## 4. Services `core/`

| Service | Rôle |
| --- | --- |
| `AuthService` | Session (jeton + utilisateur dans `localStorage`), signaux `user`, `isAuthenticated`, `isEmployee`, `isEmployer`, `isAdmin`, `homeRoute`. |
| `VerificationFlowService` | Mémorise le défi en cours (`sessionStorage`) entre la page de connexion/inscription et `/verification`. |
| `JobsService` | Recherche, détail, candidature. |
| `ProfileService` | Profil candidat ; **met le profil en cache dans un signal** partagé par les onglets. |
| `EmployeeService` / `EmployerService` / `AdminService` | Un service par espace. |
| `ReferenceDataService` | Charge `/api/reference-data` **une seule fois** (`shareReplay`) et l'expose en signal. |
| `NotificationService` | Point unique pour les `MatSnackBar` (succès / erreur / info). |

---

## 5. Intercepteurs

Ordre déclaré dans `app.config.ts` : `authInterceptor`, `loadingInterceptor`, `errorInterceptor`.

- **`authInterceptor`** ajoute `Authorization: Bearer …` sur les appels vers `/api/`.
- **`loadingInterceptor`** compte les requêtes en cours ; `LoadingService.isLoading` pilote la
  barre de progression de la barre supérieure.
- **`errorInterceptor`** traduit l'erreur en message lisible (`extractMessage`), l'affiche en
  snackbar, déconnecte sur `401` quand la session était active, puis **repropage** l'erreur pour
  que le composant puisse afficher un message local (c'est le cas des pages de connexion, qui
  gèrent elles-mêmes le `401`).

---

## 6. Formulaires et validation

Formulaires **réactifs typés** (`fb.nonNullable.group`). Les validateurs réutilisables sont dans
`core/utils/form.validators.ts` :

| Validateur | Usage |
| --- | --- |
| `matchFields('password', 'confirmPassword')` | Confirmation identique |
| `strongPassword()` | 8 caractères, une lettre, un chiffre |
| `phoneNumber()` | Format souple, international ou nord-américain |
| `verificationCode()` | Exactement 6 chiffres |
| `dateRange(début, fin, enCours?)` | Fin ≥ début, ignorée si « en cours » |
| `salaryRange(min, max)` | Max ≥ min |
| `minimumItems(n)` | Au moins n éléments |

`formErrorMessage(control, label)` centralise les messages affichés sous les champs — c'est le
seul endroit à modifier pour changer la formulation d'une erreur.

Chaque page expose une petite méthode `errorFor(control, label)` utilisée dans le gabarit :

```html
@if (form.controls.email.touched && form.controls.email.invalid) {
  <mat-error>{{ errorFor('email', "L'adresse courriel") }}</mat-error>
}
```

Les listes (compétences, tâches, secteurs) sont gérées hors du `FormGroup` par des signaux liés
à `<app-chip-list-input [(values)]="skills">`, et validées manuellement à la soumission.

---

## 7. Composants partagés

| Composant | Usage |
| --- | --- |
| `<app-status-chip [applicationStatus]="…">` / `[jobStatus]` | Puce colorée de statut |
| `<app-match-gauge [percentage] [matchedSkills] [missingSkills] size>` | Jauge circulaire ; le détail du calcul est en infobulle |
| `<app-job-card [job]>` | Carte de résultat de recherche |
| `<app-empty-state icon title message>` | État vide, avec action projetée |
| `<app-chip-list-input [(values)] [suggestions]>` | Saisie d'une liste avec autocomplétion |
| `ConfirmDialogComponent` | Confirmation avant action destructrice |

Pipes (`shared/pipes/labels.pipes.ts`) : `applicationStatus`, `jobStatus`, `contractType`,
`workMode`, `languageLevel`, `userRole`, `salaryRange`, `fileSize`, `timeAgo`.

---

## 8. Thème et styles

`styles.scss` est organisé en quatre sections :

1. **Thème Material 3** via `mat.theme(...)` — palette primaire `azure`, tertiaire `orange`,
   typographies `Inter` (texte) et `Plus Jakarta Sans` (titres).
2. **Jetons de design** (variables CSS `--jb-*`) : couleurs, rayons, ombres, largeur maximale.
   C'est ici qu'on change l'identité visuelle.
3. **Base** : réinitialisation, typographie, police d'icônes Material Symbols.
4. **Utilitaires** : `.page`, `.surface`, `.grid--2/3/4`, `.form-grid`, `.actions-row`,
   `.tone-*` (couleurs de statut), styles des snackbars et des tableaux.

Chaque page a son propre `.scss` pour sa mise en page spécifique ; tout ce qui se répète
remonte dans `styles.scss`.

**Responsive** : grilles `auto-fit` + `minmax`, points de rupture à 1023 px (colonne latérale
qui passe dessous), 899 px et 767 px (empilement), 599 px (mobile). La navigation bascule dans un
tiroir latéral en dessous de 960 px (`BreakpointObserver` dans `MainLayout`).

---

## 9. Pièges connus

- **Locale** : `registerLocaleData(localeFrCa, 'fr-CA')` et `LOCALE_ID` sont indispensables.
  Sans cela, `DatePipe` lève `NG0701` et **interrompt le rendu du reste du gabarit** — le
  symptôme est une page à moitié vide sans erreur visible à l'écran.
- **Zoneless** : un `this.maVariable = x` dans un `subscribe` ne redessine rien. Utiliser
  `signal.set()`.
- **Boutons Material 3** : la syntaxe est `<button matButton>`, `matButton="filled"`,
  `matButton="outlined"`, `matButton="tonal"`, `<button matIconButton>`. L'ancienne syntaxe
  `mat-raised-button` est dépréciée. Pour colorer un bouton, passer par une classe CSS
  (`.danger-action`) plutôt que par l'entrée `color`.
- **Enums** : toute valeur ajoutée côté C# doit l'être aussi dans `api.models.ts` et dans les
  tables de libellés de `core/utils/labels.ts`.

---

## 10. Commandes

```bash
npm start          # serveur de développement, http://localhost:4200
npm run build      # build de production dans dist/
npm run watch      # build de développement en continu
```
