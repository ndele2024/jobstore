import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { ApplicationStatus, JobStatus } from '../../core/models/api.models';
import {
  APPLICATION_STATUS_LABELS,
  APPLICATION_STATUS_TONES,
  JOB_STATUS_LABELS,
  JOB_STATUS_TONES,
} from '../../core/utils/labels';

/**
 * Puce colorée de statut, pour une candidature ou une offre.
 *
 * Usage: <app-status-chip [applicationStatus]="app.status" />
 *        <app-status-chip [jobStatus]="job.status" />
 */
@Component({
  selector: 'app-status-chip',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<span class="status-chip" [class]="tone()">{{ label() }}</span>`,
  styles: [
    `
      .status-chip {
        display: inline-flex;
        align-items: center;
        padding: 0.2rem 0.7rem;
        border-radius: 999px;
        font-size: 0.75rem;
        font-weight: 600;
        letter-spacing: 0.01em;
        white-space: nowrap;
      }
    `,
  ],
})
export class StatusChipComponent {
  readonly applicationStatus = input<ApplicationStatus | null>(null);
  readonly jobStatus = input<JobStatus | null>(null);

  readonly label = computed(() => {
    const application = this.applicationStatus();
    if (application) return APPLICATION_STATUS_LABELS[application];

    const job = this.jobStatus();
    return job ? JOB_STATUS_LABELS[job] : '-';
  });

  readonly tone = computed(() => {
    const application = this.applicationStatus();
    if (application) return APPLICATION_STATUS_TONES[application];

    const job = this.jobStatus();
    return job ? JOB_STATUS_TONES[job] : 'tone-neutral';
  });
}
