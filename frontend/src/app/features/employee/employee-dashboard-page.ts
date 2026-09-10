import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Router, RouterLink } from '@angular/router';

import { EmployeeDashboard } from '../../core/models/api.models';
import { EmployeeService } from '../../core/services/employee.service';
import { EmptyStateComponent } from '../../shared/components/empty-state.component';
import { MatchGaugeComponent } from '../../shared/components/match-gauge.component';
import { StatusChipComponent } from '../../shared/components/status-chip.component';
import { SalaryRangePipe, TimeAgoPipe } from '../../shared/pipes/labels.pipes';

/**
 * Tableau de bord du candidat.
 *
 * Trois zones: resume du profil (avec taux de completion),
 * offres recommandees (3 a la fois, navigation par pages) et candidatures recentes.
 */
@Component({
  selector: 'app-employee-dashboard-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    RouterLink,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatProgressBarModule,
    MatProgressSpinnerModule,
    MatFormFieldModule,
    MatInputModule,
    MatTooltipModule,
    MatchGaugeComponent,
    StatusChipComponent,
    EmptyStateComponent,
    SalaryRangePipe,
    TimeAgoPipe,
  ],
  templateUrl: './employee-dashboard-page.html',
  styleUrl: './employee-dashboard-page.scss',
})
export class EmployeeDashboardPage {
  private readonly employeeService = inject(EmployeeService);
  private readonly router = inject(Router);

  readonly dashboard = signal<EmployeeDashboard | null>(null);
  readonly loading = signal(true);
  readonly quickSearch = signal('');

  /** Index de la page de recommandations affichee (3 offres par page). */
  readonly recommendationPage = signal(0);
  private readonly pageSize = 3;

  readonly recommendationPages = computed(() =>
    Math.max(1, Math.ceil((this.dashboard()?.recommendations.length ?? 0) / this.pageSize)),
  );

  readonly visibleRecommendations = computed(() => {
    const all = this.dashboard()?.recommendations ?? [];
    const start = this.recommendationPage() * this.pageSize;
    return all.slice(start, start + this.pageSize);
  });

  /** Compteurs de candidatures avec au moins une occurrence. */
  readonly activeStatusCounts = computed(
    () => this.dashboard()?.applicationsByStatus.filter((entry) => entry.count > 0) ?? [],
  );

  constructor() {
    this.employeeService.getDashboard().subscribe({
      next: (data) => {
        this.dashboard.set(data);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  previousRecommendations(): void {
    this.recommendationPage.update((page) => Math.max(0, page - 1));
  }

  nextRecommendations(): void {
    this.recommendationPage.update((page) => Math.min(this.recommendationPages() - 1, page + 1));
  }

  runQuickSearch(): void {
    void this.router.navigate(['/emplois'], {
      queryParams: { keyword: this.quickSearch().trim() || null },
    });
  }
}
