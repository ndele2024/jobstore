import { ChangeDetectionStrategy, Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableModule } from '@angular/material/table';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RouterLink } from '@angular/router';

import {
  ApplicationStatus,
  EmployerJobDetails,
  JobApplicant,
  JobStatus,
} from '../../core/models/api.models';
import { EmployerService } from '../../core/services/employer.service';
import { NotificationService } from '../../core/services/notification.service';
import { downloadBlob } from '../../core/utils/labels';
import { EmptyStateComponent } from '../../shared/components/empty-state.component';
import { MatchGaugeComponent } from '../../shared/components/match-gauge.component';
import { StatusChipComponent } from '../../shared/components/status-chip.component';
import {
  ContractTypePipe,
  LanguageLevelPipe,
  SalaryRangePipe,
  TimeAgoPipe,
  WorkModePipe,
} from '../../shared/pipes/labels.pipes';

/**
 * Suivi d'une offre cote entreprise.
 *
 * Deux onglets: les candidats (classes par correspondance, avec le detail
 * complet du profil et le changement de statut) et les visiteurs
 * (utilisateurs ayant consulte l'offre, meme sans postuler).
 */
@Component({
  selector: 'app-employer-job-details-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    MatTabsModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatDividerModule,
    MatExpansionModule,
    MatMenuModule,
    MatTableModule,
    MatTooltipModule,
    MatProgressSpinnerModule,
    MatchGaugeComponent,
    StatusChipComponent,
    EmptyStateComponent,
    SalaryRangePipe,
    ContractTypePipe,
    WorkModePipe,
    LanguageLevelPipe,
    TimeAgoPipe,
  ],
  templateUrl: './employer-job-details-page.html',
  styleUrl: './employer-job-details-page.scss',
})
export class EmployerJobDetailsPage implements OnInit {
  private readonly employerService = inject(EmployerService);
  private readonly notifications = inject(NotificationService);

  readonly id = input.required<string>();

  readonly details = signal<EmployerJobDetails | null>(null);
  readonly loading = signal(true);

  readonly applicationStatus = ApplicationStatus;
  readonly jobStatus = JobStatus;
  readonly viewerColumns = ['name', 'location', 'views', 'applied', 'last'];

  /** Nombre de candidatures encore au statut "soumise". */
  readonly pendingCount = computed(
    () =>
      this.details()?.applicants.filter((a) => a.status === ApplicationStatus.Submitted).length ?? 0,
  );

  ngOnInit(): void {
    this.load();
  }

  private load(): void {
    this.loading.set(true);
    this.employerService.getJobDetails(this.id()).subscribe({
      next: (details) => {
        this.details.set(details);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  /** Met a jour le statut d'une candidature (en analyse, preselection, refus, acceptation). */
  setApplicationStatus(applicant: JobApplicant, status: ApplicationStatus): void {
    this.employerService.updateApplicationStatus(applicant.applicationId, { status }).subscribe({
      next: () => {
        this.notifications.success(`Candidature de ${applicant.candidateName} mise a jour.`);
        this.load();
      },
    });
  }

  changeJobStatus(status: JobStatus): void {
    this.employerService.updateJobStatus(this.id(), status).subscribe({
      next: () => {
        this.notifications.success('Statut de l’offre mis a jour.');
        this.load();
      },
    });
  }

  downloadResume(applicant: JobApplicant): void {
    if (!applicant.resumeId) {
      return;
    }

    this.employerService
      .downloadCandidateResume(applicant.employeeId, applicant.resumeId)
      .subscribe({
        next: (blob) => downloadBlob(blob, applicant.resumeName || 'cv'),
      });
  }
}
