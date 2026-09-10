import { Routes } from '@angular/router';

import { authGuard, guestGuard, roleGuard } from './core/guards/auth.guards';
import { UserRole } from './core/models/api.models';

/**
 * Table de routage.
 *
 * Chaque page est chargee a la demande (lazy loading) pour garder
 * le premier chargement leger. Les espaces prives sont proteges par des guards.
 */
export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./features/home/home-page').then((m) => m.HomePage),
    title: 'JobStore - Trouvez votre prochain emploi',
  },

  // --- Offres (public) -----------------------------------------------------
  {
    path: 'emplois',
    loadComponent: () => import('./features/jobs/job-search-page').then((m) => m.JobSearchPage),
    title: "Offres d'emploi - JobStore",
  },
  {
    path: 'emplois/:id',
    loadComponent: () => import('./features/jobs/job-details-page').then((m) => m.JobDetailsPage),
    title: "Detail de l'offre - JobStore",
  },

  // --- Authentification ----------------------------------------------------
  {
    path: 'connexion',
    canActivate: [guestGuard],
    loadComponent: () => import('./features/auth/login-page').then((m) => m.LoginPage),
    title: 'Connexion - JobStore',
  },
  {
    path: 'inscription',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./features/auth/register-choice-page').then((m) => m.RegisterChoicePage),
    title: 'Creer un compte - JobStore',
  },
  {
    path: 'inscription/candidat',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./features/auth/register-employee-page').then((m) => m.RegisterEmployeePage),
    title: 'Inscription candidat - JobStore',
  },
  {
    path: 'inscription/entreprise',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./features/auth/register-employer-page').then((m) => m.RegisterEmployerPage),
    title: 'Inscription entreprise - JobStore',
  },
  {
    path: 'verification',
    loadComponent: () => import('./features/auth/verify-code-page').then((m) => m.VerifyCodePage),
    title: 'Verification du code - JobStore',
  },
  {
    path: 'mon-compte',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/auth/account-settings-page').then((m) => m.AccountSettingsPage),
    title: 'Parametres du compte - JobStore',
  },

  // --- Espace candidat -----------------------------------------------------
  {
    path: 'candidat',
    canActivate: [roleGuard(UserRole.Employee)],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'tableau-de-bord' },
      {
        path: 'tableau-de-bord',
        loadComponent: () =>
          import('./features/employee/employee-dashboard-page').then((m) => m.EmployeeDashboardPage),
        title: 'Tableau de bord candidat - JobStore',
      },
      {
        path: 'profil',
        loadComponent: () =>
          import('./features/employee/profile/profile-page').then((m) => m.ProfilePage),
        title: 'Mon profil - JobStore',
      },
      {
        path: 'candidatures',
        loadComponent: () =>
          import('./features/employee/applications-page').then((m) => m.ApplicationsPage),
        title: 'Mes candidatures - JobStore',
      },
    ],
  },

  // --- Espace entreprise ---------------------------------------------------
  {
    path: 'entreprise',
    canActivate: [roleGuard(UserRole.Employer)],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'tableau-de-bord' },
      {
        path: 'tableau-de-bord',
        loadComponent: () =>
          import('./features/employer/employer-dashboard-page').then((m) => m.EmployerDashboardPage),
        title: 'Tableau de bord entreprise - JobStore',
      },
      {
        path: 'offres',
        loadComponent: () =>
          import('./features/employer/employer-jobs-page').then((m) => m.EmployerJobsPage),
        title: 'Mes offres - JobStore',
      },
      {
        path: 'offres/nouvelle',
        loadComponent: () => import('./features/employer/job-form-page').then((m) => m.JobFormPage),
        title: 'Nouvelle offre - JobStore',
      },
      {
        path: 'offres/:id/modifier',
        loadComponent: () => import('./features/employer/job-form-page').then((m) => m.JobFormPage),
        title: "Modifier l'offre - JobStore",
      },
      {
        path: 'offres/:id',
        loadComponent: () =>
          import('./features/employer/employer-job-details-page').then(
            (m) => m.EmployerJobDetailsPage,
          ),
        title: "Suivi de l'offre - JobStore",
      },
      {
        path: 'profil',
        loadComponent: () =>
          import('./features/employer/company-profile-page').then((m) => m.CompanyProfilePage),
        title: "Profil de l'entreprise - JobStore",
      },
    ],
  },

  // --- Administration ------------------------------------------------------
  {
    path: 'administration',
    canActivate: [roleGuard(UserRole.Admin)],
    loadComponent: () => import('./features/admin/admin-page').then((m) => m.AdminPage),
    title: 'Administration - JobStore',
  },

  { path: '**', redirectTo: '' },
];
