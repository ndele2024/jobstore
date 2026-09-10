import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { Router, RouterLink } from '@angular/router';

import { JobCard } from '../../core/models/api.models';
import { AuthService } from '../../core/services/auth.service';
import { JobsService } from '../../core/services/jobs.service';
import { JobCardComponent } from '../../shared/components/job-card.component';

/** Page d'accueil publique: proposition de valeur, recherche rapide et dernieres offres. */
@Component({
  selector: 'app-home-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    RouterLink,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    JobCardComponent,
  ],
  templateUrl: './home-page.html',
  styleUrl: './home-page.scss',
})
export class HomePage {
  private readonly jobsService = inject(JobsService);
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);

  readonly keyword = signal('');
  readonly city = signal('');
  readonly latestJobs = signal<JobCard[]>([]);
  readonly totalJobs = signal(0);
  readonly isAuthenticated = this.auth.isAuthenticated;
  readonly homeRoute = this.auth.homeRoute;

  constructor() {
    this.jobsService.search({ page: 1, pageSize: 6, sortBy: 'recent' }).subscribe({
      next: (response) => {
        this.latestJobs.set(response.items);
        this.totalJobs.set(response.totalCount);
      },
      error: () => this.latestJobs.set([]),
    });
  }

  /** Lance la recherche en transmettant les criteres a la page /emplois. */
  search(): void {
    void this.router.navigate(['/emplois'], {
      queryParams: {
        keyword: this.keyword().trim() || null,
        city: this.city().trim() || null,
      },
    });
  }
}
