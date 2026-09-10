import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatMenuModule } from '@angular/material/menu';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { map } from 'rxjs';

import { LoadingService } from '../core/interceptors/loading.interceptor';
import { UserRole } from '../core/models/api.models';
import { AuthService } from '../core/services/auth.service';
import { ProfileService } from '../core/services/profile.service';

interface NavItem {
  label: string;
  route: string;
  icon: string;
}

/**
 * Ossature de l'application: barre superieure, menu lateral sur mobile,
 * indicateur de chargement global et pied de page.
 *
 * Les entrees de menu dependent du role connecte (signal `navItems`).
 */
@Component({
  selector: 'app-main-layout',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    RouterLinkActive,
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MatSidenavModule,
    MatListModule,
    MatDividerModule,
    MatProgressBarModule,
    MatTooltipModule,
  ],
  templateUrl: './main-layout.html',
  styleUrl: './main-layout.scss',
})
export class MainLayout {
  private readonly auth = inject(AuthService);
  private readonly profileService = inject(ProfileService);
  private readonly router = inject(Router);
  private readonly loading = inject(LoadingService);
  private readonly breakpoints = inject(BreakpointObserver);

  readonly user = this.auth.user;
  readonly isAuthenticated = this.auth.isAuthenticated;
  readonly isLoading = this.loading.isLoading;
  readonly menuOpen = signal(false);

  /** Vrai en dessous de 960 px: la navigation passe alors dans le tiroir lateral. */
  readonly isHandset = toSignal(
    this.breakpoints
      .observe([Breakpoints.Handset, Breakpoints.TabletPortrait])
      .pipe(map((result) => result.matches)),
    { initialValue: false },
  );

  /** Initiales affichees dans la pastille du menu utilisateur. */
  readonly initials = computed(() => {
    const user = this.user();
    if (!user) return '';

    const source = user.role === UserRole.Employer ? user.companyName : `${user.firstName} ${user.lastName}`;
    return source
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? '')
      .join('');
  });

  /** Menu principal, adapte au role. */
  readonly navItems = computed<NavItem[]>(() => {
    const common: NavItem[] = [{ label: "Offres d'emploi", route: '/emplois', icon: 'search' }];

    switch (this.auth.role()) {
      case UserRole.Employee:
        return [
          { label: 'Tableau de bord', route: '/candidat/tableau-de-bord', icon: 'dashboard' },
          ...common,
          { label: 'Mes candidatures', route: '/candidat/candidatures', icon: 'work_history' },
          { label: 'Mon profil', route: '/candidat/profil', icon: 'badge' },
        ];

      case UserRole.Employer:
        return [
          { label: 'Tableau de bord', route: '/entreprise/tableau-de-bord', icon: 'dashboard' },
          { label: 'Mes offres', route: '/entreprise/offres', icon: 'work' },
          { label: "Profil de l'entreprise", route: '/entreprise/profil', icon: 'apartment' },
        ];

      case UserRole.Admin:
        return [
          { label: 'Administration', route: '/administration', icon: 'admin_panel_settings' },
          ...common,
        ];

      default:
        return common;
    }
  });

  toggleMenu(): void {
    this.menuOpen.update((open) => !open);
  }

  closeMenu(): void {
    this.menuOpen.set(false);
  }

  logout(): void {
    this.profileService.clear();
    this.auth.logout(false);
    this.closeMenu();
    void this.router.navigate(['/']);
  }
}
