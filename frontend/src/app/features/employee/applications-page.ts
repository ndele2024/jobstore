import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RouterLink } from '@angular/router';

import { ApplicationStatus, MyApplication } from '../../core/models/api.models';
import { EmployeeService } from '../../core/services/employee.service';
import { NotificationService } from '../../core/services/notification.service';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog.component';
import { EmptyStateComponent } from '../../shared/components/empty-state.component';
import { MatchGaugeComponent } from '../../shared/components/match-gauge.component';
import { StatusChipComponent } from '../../shared/components/status-chip.component';
import { TimeAgoPipe } from '../../shared/pipes/labels.pipes';

/** Liste des candidatures du candidat, filtrable par statut. */
@Component({
  selector: 'app-applications-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    MatButtonModule,
    MatButtonToggleModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    StatusChipComponent,
    MatchGaugeComponent,
    EmptyStateComponent,
    TimeAgoPipe,
  ],
  templateUrl: './applications-page.html',
  styleUrl: './applications-page.scss',
})
export class ApplicationsPage {
  private readonly employeeService = inject(EmployeeService);
  private readonly dialog = inject(MatDialog);
  private readonly notifications = inject(NotificationService);

  readonly applications = signal<MyApplication[]>([]);
  readonly loading = signal(true);
  readonly filter = signal<ApplicationStatus | 'all'>('all');

  readonly statuses = [
    { value: 'all' as const, label: 'Toutes' },
    { value: ApplicationStatus.Submitted, label: 'Soumises' },
    { value: ApplicationStatus.InReview, label: 'En analyse' },
    { value: ApplicationStatus.Shortlisted, label: 'Présélectionnées' },
    { value: ApplicationStatus.Accepted, label: 'Acceptées' },
    { value: ApplicationStatus.Rejected, label: 'Refusées' },
  ];

  readonly visible = computed(() => {
    const filter = this.filter();
    const all = this.applications();
    return filter === 'all' ? all : all.filter((application) => application.status === filter);
  });

  /** Une candidature deja tranchee ne peut plus etre retiree (regle appliquee aussi cote API). */
  readonly canWithdraw = (status: ApplicationStatus): boolean =>
    status !== ApplicationStatus.Accepted && status !== ApplicationStatus.Rejected;

  constructor() {
    this.load();
  }

  setFilter(value: ApplicationStatus | 'all'): void {
    this.filter.set(value);
  }

  withdraw(application: MyApplication): void {
    this.dialog
      .open(ConfirmDialogComponent, {
        data: {
          title: 'Retirer la candidature',
          message: `Voulez-vous retirer votre candidature pour "${application.jobTitle}" ? Cette action est definitive.`,
          confirmLabel: 'Retirer',
          danger: true,
        },
      })
      .afterClosed()
      .subscribe((confirmed) => {
        if (!confirmed) {
          return;
        }

        this.employeeService.withdrawApplication(application.id).subscribe({
          next: () => {
            this.notifications.success('Candidature retiree.');
            this.load();
          },
        });
      });
  }

  private load(): void {
    this.loading.set(true);
    this.employeeService.getApplications().subscribe({
      next: (items) => {
        this.applications.set(items);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }
}
