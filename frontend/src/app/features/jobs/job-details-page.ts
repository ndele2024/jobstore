import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialog } from '@angular/material/dialog';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Router, RouterLink } from '@angular/router';

import { JobDetails } from '../../core/models/api.models';
import { AuthService } from '../../core/services/auth.service';
import { JobsService } from '../../core/services/jobs.service';
import { daysUntil } from '../../core/utils/labels';
import { MatchGaugeComponent } from '../../shared/components/match-gauge.component';
import { ContractTypePipe, SalaryRangePipe, WorkModePipe } from '../../shared/pipes/labels.pipes';
import { ApplyDialogComponent } from './apply-dialog.component';

/**
 * Detail d'une offre.
 *
 * La consultation par un candidat connecte est enregistree cote API
 * (statistiques employeur), meme sans candidature.
 */
@Component({
  selector: 'app-job-details-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DatePipe,
    RouterLink,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatDividerModule,
    MatProgressSpinnerModule,
    MatchGaugeComponent,
    SalaryRangePipe,
    ContractTypePipe,
    WorkModePipe,
  ],
  templateUrl: './job-details-page.html',
  styleUrl: './job-details-page.scss',
})
export class JobDetailsPage implements OnInit {
  private readonly jobsService = inject(JobsService);
  private readonly auth = inject(AuthService);
  private readonly dialog = inject(MatDialog);
  private readonly router = inject(Router);

  /** Identifiant fourni par le routeur (withComponentInputBinding). */
  readonly id = input.required<string>();

  readonly job = signal<JobDetails | null>(null);
  readonly loading = signal(true);
  readonly notFound = signal(false);

  readonly isEmployee = this.auth.isEmployee;
  readonly isAuthenticated = this.auth.isAuthenticated;

  readonly expired = computed(() => {
    const job = this.job();
    return job ? daysUntil(job.displayUntil) < 0 : false;
  });

  readonly canApply = computed(() => {
    const job = this.job();
    return Boolean(job && !job.isExternal && !job.hasApplied && !this.expired());
  });

  ngOnInit(): void {
    // Les inputs lies au routeur sont disponibles a partir de ngOnInit.
    this.load();
  }

  private load(): void {
    this.loading.set(true);
    this.jobsService.getById(this.id()).subscribe({
      next: (job) => {
        this.job.set(job);
        this.loading.set(false);
      },
      error: () => {
        this.notFound.set(true);
        this.loading.set(false);
      },
    });
  }

  apply(): void {
    const job = this.job();
    if (!job) {
      return;
    }

    if (!this.isAuthenticated()) {
      void this.router.navigate(['/connexion'], {
        queryParams: { redirect: `/emplois/${job.id}` },
      });
      return;
    }

    if (!this.isEmployee()) {
      return;
    }

    this.dialog
      .open(ApplyDialogComponent, { data: { job }, maxWidth: '96vw', autoFocus: 'dialog' })
      .afterClosed()
      .subscribe((application) => {
        if (application) {
          this.load();
        }
      });
  }
}
