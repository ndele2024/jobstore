import { ChangeDetectionStrategy, Component } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';

/** Choix du type de compte avant l'inscription. */
@Component({
  selector: 'app-register-choice-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, MatIconModule],
  template: `
    <div class="auth auth--wide">
      <h1 class="auth__title">Créer un compte JobStore</h1>
      <p class="auth__subtitle">
        Choisissez le type de compte correspondant à votre besoin. Vous pourrez compléter votre
        profil ensuite.
      </p>

      <div class="choice-grid">
        <a class="choice-card" routerLink="/inscription/candidat">
          <mat-icon>person_search</mat-icon>
          <h2>Je cherche un emploi</h2>
          <p>Compte candidat</p>
          <ul>
            <li>Profil détaillé et CV téléversés</li>
            <li>Offres recommandées selon votre profil</li>
            <li>Suivi de toutes vos candidatures</li>
          </ul>
        </a>

        <a class="choice-card" routerLink="/inscription/entreprise">
          <mat-icon>apartment</mat-icon>
          <h2>Je recrute</h2>
          <p>Compte entreprise</p>
          <ul>
            <li>Publication et gestion des offres</li>
            <li>Candidats classés par correspondance</li>
            <li>Statistiques de consultation</li>
          </ul>
        </a>
      </div>

      <p class="auth__footer">Vous avez déjà un compte ? <a routerLink="/connexion">Se connecter</a></p>
    </div>
  `,
  styleUrl: './auth-shell.scss',
})
export class RegisterChoicePage {}
