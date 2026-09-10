import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RouterLink } from '@angular/router';

import { JobCard, JobStatus } from '../../core/models/api.models';
import { EmployerService } from '../../core/services/employer.service';
import { NotificationService } from '../../core/services/notification.service';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog.component';
import { EmptyStateComponent } from '../../shared/components/empty-state.component';
import { StatusChipComponent } from '../../shared/components/status-chip.component';
import { ContractTypePipe, SalaryRangePipe, WorkModePipe } from '../../shared/pipes/labels.pipes';

/**
 * Gestion des offres de l'entreprise: filtrage par statut,
 * changement de statut (publier / fermer / repasser en brouillon) et suppression.
 */
@Component({
  selector: 'app-employer-jobs-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    MatButtonModule,
    MatButtonToggleModule,
    MatIconModule,
    MatMenuModule,
    MatTooltipModule,
    MatProgressSpinnerModule,
    StatusChipComponent,
    EmptyStateComponent,
    SalaryRangePipe,
    ContractTypePipe,
    WorkModePipe,
  ],
  templateUrl: './employer-jobs-page.html',
  styleUrl: './employer-jobs-page.scss',
})
export class EmployerJobsPage {
  private readonly employerService = inject(EmployerService);
  private readonly dialog = inject(MatDialog);
  private readonly notifications = inject(NotificationService);

  readonly jobs = signal<JobCard[]>([]);
  readonly loading = signal(true);
  readonly filter = signal<JobStatus | 'all'>('all');

  readonly jobStatus = JobStatus;

  readonly filters = [
    { value: 'all' as const, label: 'Toutes' },
    { value: JobStatus.Published, label: 'Publiées' },
    { value: JobStatus.Draft, label: 'Brouillons' },
    { value: JobStatus.Closed, label: 'Fermées' },
  ];

  readonly visible = computed(() => {
    const filter = this.filter();
    const all = this.jobs();
    return filter === 'all' ? all : all.filter((job) => job.status === filter);
  });

  constructor() {
    this.load();
  }

  setFilter(value: JobStatus | 'all'): void {
    this.filter.set(value);
  }

  changeStatus(job: JobCard, status: JobStatus): void {
    this.employerService.updateJobStatus(job.id, status).subscribe({
      next: () => {
        this.notifications.success('Statut de l’offre mis a jour.');
        this.load();
      },
    });
  }

  deleteJob(job: JobCard): void {
    this.dialog
      .open(ConfirmDialogComponent, {
        data: {
          title: 'Supprimer l’offre',
          message: `Supprimer "${job.title}" ? Si des candidatures existent, l'offre est archivee afin de conserver l'historique des candidats.`,
          confirmLabel: 'Supprimer',
          danger: true,
        },
      })
      .afterClosed()
      .subscribe((confirmed) => {
        if (!confirmed) {
          return;
        }

        this.employerService.deleteJob(job.id).subscribe({
          next: () => {
            this.notifications.success('Offre supprimee.');
            this.load();
          },
        });
      });
  }

  private load(): void {
    this.loading.set(true);
    this.employerService.getJobs().subscribe({
      next: (jobs) => {
        this.jobs.set(jobs);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }
}
