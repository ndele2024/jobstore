import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { ActivatedRoute, Router } from '@angular/router';

import { ContractType, JobCard, WorkMode } from '../../core/models/api.models';
import { AuthService } from '../../core/services/auth.service';
import { JobsService } from '../../core/services/jobs.service';
import { ReferenceDataService } from '../../core/services/reference-data.service';
import { EmptyStateComponent } from '../../shared/components/empty-state.component';
import { JobCardComponent } from '../../shared/components/job-card.component';

/**
 * Recherche d'offres.
 *
 * Les criteres sont refletes dans l'URL: une recherche est partageable
 * et survit a un rafraichissement de la page.
 */
@Component({
  selector: 'app-job-search-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatPaginatorModule,
    MatProgressSpinnerModule,
    MatExpansionModule,
    JobCardComponent,
    EmptyStateComponent,
  ],
  templateUrl: './job-search-page.html',
  styleUrl: './job-search-page.scss',
})
export class JobSearchPage {
  private readonly fb = inject(FormBuilder);
  private readonly jobsService = inject(JobsService);
  private readonly referenceData = inject(ReferenceDataService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly auth = inject(AuthService);

  readonly reference = this.referenceData.data;
  readonly isEmployee = this.auth.isEmployee;

  readonly jobs = signal<JobCard[]>([]);
  readonly totalCount = signal(0);
  readonly pageIndex = signal(0);
  readonly pageSize = signal(10);
  readonly loading = signal(false);

  readonly hasResults = computed(() => this.jobs().length > 0);

  readonly contractTypes = ContractType;
  readonly workModes = WorkMode;

  readonly form = this.fb.nonNullable.group({
    keyword: [''],
    domain: [''],
    city: [''],
    sector: [''],
    minimumSalary: [null as number | null],
    contractType: [null as ContractType | null],
    workMode: [null as WorkMode | null],
    sortBy: ['recent'],
  });

  constructor() {
    this.referenceData.load().subscribe();

    // Restaure les criteres presents dans l'URL (lien partage, retour arriere).
    const params = this.route.snapshot.queryParamMap;
    this.form.patchValue({
      keyword: params.get('keyword') ?? '',
      domain: params.get('domain') ?? '',
      city: params.get('city') ?? '',
      sector: params.get('sector') ?? '',
      minimumSalary: params.get('minimumSalary') ? Number(params.get('minimumSalary')) : null,
      contractType: params.get('contractType') ? Number(params.get('contractType')) : null,
      workMode: params.get('workMode') ? Number(params.get('workMode')) : null,
      sortBy: params.get('sortBy') ?? 'recent',
    });

    this.fetch();
  }

  search(): void {
    this.pageIndex.set(0);
    this.syncUrl();
    this.fetch();
  }

  reset(): void {
    this.form.reset({ sortBy: 'recent' });
    this.pageIndex.set(0);
    this.syncUrl();
    this.fetch();
  }

  changePage(event: PageEvent): void {
    this.pageIndex.set(event.pageIndex);
    this.pageSize.set(event.pageSize);
    this.fetch();
  }

  /** Recharge la liste avec les criteres courants. */
  private fetch(): void {
    this.loading.set(true);
    const criteria = this.form.getRawValue();

    this.jobsService
      .search({
        ...criteria,
        page: this.pageIndex() + 1,
        pageSize: this.pageSize(),
      })
      .subscribe({
        next: (response) => {
          this.jobs.set(response.items);
          this.totalCount.set(response.totalCount);
          this.loading.set(false);
        },
        error: () => {
          this.jobs.set([]);
          this.totalCount.set(0);
          this.loading.set(false);
        },
      });
  }

  /** Ecrit les criteres non vides dans l'URL. */
  private syncUrl(): void {
    const raw = this.form.getRawValue();
    const queryParams: Record<string, string | number> = {};

    Object.entries(raw).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== '' && key !== 'sortBy') {
        queryParams[key] = value as string | number;
      }
    });

    if (raw.sortBy && raw.sortBy !== 'recent') {
      queryParams['sortBy'] = raw.sortBy;
    }

    void this.router.navigate([], { relativeTo: this.route, queryParams, replaceUrl: true });
  }
}
