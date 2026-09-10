import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RouterLink } from '@angular/router';

import { EmployerDashboard } from '../../core/models/api.models';
import { EmployerService } from '../../core/services/employer.service';
import { EmptyStateComponent } from '../../shared/components/empty-state.component';
import { StatusChipComponent } from '../../shared/components/status-chip.component';

/**
 * Cockpit employeur: indicateurs de la plateforme,
 * repartition des candidatures et tableau de suivi des offres.
 */
@Component({
  selector: 'app-employer-dashboard-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatTableModule,
    MatTooltipModule,
    MatProgressSpinnerModule,
    StatusChipComponent,
    EmptyStateComponent,
  ],
  templateUrl: './employer-dashboard-page.html',
  styleUrl: './employer-dashboard-page.scss',
})
export class EmployerDashboardPage {
  private readonly employerService = inject(EmployerService);

  readonly dashboard = signal<EmployerDashboard | null>(null);
  readonly loading = signal(true);

  readonly displayedColumns = ['title', 'status', 'views', 'applications', 'best', 'deadline', 'actions'];

  readonly activeStatusCounts = computed(
    () => this.dashboard()?.applicationsByStatus.filter((entry) => entry.count > 0) ?? [],
  );

  constructor() {
    this.employerService.getDashboard().subscribe({
      next: (data) => {
        this.dashboard.set(data);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }
}
