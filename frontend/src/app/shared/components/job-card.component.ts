import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';

import { JobCard } from '../../core/models/api.models';
import { daysUntil } from '../../core/utils/labels';
import { ContractTypePipe, SalaryRangePipe, WorkModePipe } from '../pipes/labels.pipes';
import { MatchGaugeComponent } from './match-gauge.component';

/**
 * Carte de resultat de recherche.
 * Volontairement compacte: le detail complet est sur la page de l'offre.
 */
@Component({
  selector: 'app-job-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    MatCardModule,
    MatChipsModule,
    MatIconModule,
    MatTooltipModule,
    MatchGaugeComponent,
    SalaryRangePipe,
    ContractTypePipe,
    WorkModePipe,
  ],
  template: `
    <mat-card class="job-card" appearance="outlined">
      <a class="job-card__link" [routerLink]="['/emplois', job().id]">
        <div class="job-card__head">
          <div class="job-card__identity">
            <h3 class="job-card__title">{{ job().title }}</h3>
            <p class="job-card__employer">
              <mat-icon inline>business</mat-icon>
              {{ job().employerName }}
            </p>
          </div>

          @if (job().matchPercentage !== null) {
            <app-match-gauge [percentage]="job().matchPercentage" />
          }
        </div>

        <div class="job-card__meta">
          <span><mat-icon inline>place</mat-icon> {{ job().city }}, {{ job().country }}</span>
          <span><mat-icon inline>payments</mat-icon> {{ job().salaryMin | salaryRange: job().salaryMax }}</span>
          <span><mat-icon inline>schedule</mat-icon> {{ job().contractType | contractType }}</span>
          <span><mat-icon inline>laptop</mat-icon> {{ job().workMode | workMode }}</span>
        </div>

        <div class="job-card__footer">
          <mat-chip-set>
            <mat-chip disabled>{{ job().domain }}</mat-chip>
            @if (job().isExternal) {
              <mat-chip disabled class="chip-external">Offre partenaire</mat-chip>
            }
          </mat-chip-set>

          <span class="job-card__deadline" [class.job-card__deadline--soon]="remaining() <= 7">
            {{ deadlineLabel() }}
          </span>
        </div>
      </a>
    </mat-card>
  `,
  styles: [
    `
      .job-card {
        transition:
          transform 0.18s ease,
          box-shadow 0.18s ease,
          border-color 0.18s ease;
      }

      .job-card:hover {
        transform: translateY(-2px);
        border-color: var(--jb-primary);
        box-shadow: var(--jb-shadow-md);
      }

      .job-card__link {
        display: block;
        padding: 1.15rem 1.25rem;
        color: inherit;
        text-decoration: none;
      }

      .job-card__head {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 1rem;
      }

      .job-card__title {
        margin: 0 0 0.25rem;
        font-size: 1.05rem;
        font-weight: 700;
        line-height: 1.35;
      }

      .job-card__employer {
        margin: 0;
        display: flex;
        align-items: center;
        gap: 0.35rem;
        color: var(--jb-muted);
        font-size: 0.88rem;
      }

      .job-card__meta {
        display: flex;
        flex-wrap: wrap;
        gap: 0.35rem 1.1rem;
        margin: 0.9rem 0;
        font-size: 0.85rem;
        color: var(--jb-muted);
      }

      .job-card__meta span {
        display: inline-flex;
        align-items: center;
        gap: 0.3rem;
      }

      .job-card__footer {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 0.75rem;
        flex-wrap: wrap;
      }

      .job-card__deadline {
        font-size: 0.78rem;
        color: var(--jb-muted);
      }

      .job-card__deadline--soon {
        color: var(--jb-danger);
        font-weight: 600;
      }

      @media (max-width: 599px) {
        .job-card__meta {
          gap: 0.3rem 0.75rem;
        }
      }
    `,
  ],
})
export class JobCardComponent {
  readonly job = input.required<JobCard>();

  readonly remaining = computed(() => daysUntil(this.job().displayUntil));

  readonly deadlineLabel = computed(() => {
    const days = this.remaining();
    if (days < 0) return 'Affichage termine';
    if (days === 0) return "Dernier jour d'affichage";
    if (days === 1) return 'Se termine demain';
    return `Encore ${days} jours`;
  });
}
