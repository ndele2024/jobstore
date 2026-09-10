import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { Router, RouterLink } from '@angular/router';

import { ContractType, JobStatus, WorkMode } from '../../core/models/api.models';
import { EmployerService } from '../../core/services/employer.service';
import { NotificationService } from '../../core/services/notification.service';
import { ReferenceDataService } from '../../core/services/reference-data.service';
import { formErrorMessage, salaryRange } from '../../core/utils/form.validators';
import { fromDateOnly, toDateOnly } from '../../core/utils/labels';
import { ChipListInputComponent } from '../../shared/components/chip-list-input.component';

/**
 * Creation et modification d'une offre.
 *
 * La meme page sert aux deux cas: la presence du parametre de route `id`
 * bascule le formulaire en mode modification.
 */
@Component({
  selector: 'app-job-form-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatAutocompleteModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    ChipListInputComponent,
  ],
  templateUrl: './job-form-page.html',
  styleUrl: './job-form-page.scss',
})
export class JobFormPage implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly employerService = inject(EmployerService);
  private readonly referenceData = inject(ReferenceDataService);
  private readonly notifications = inject(NotificationService);
  private readonly router = inject(Router);

  /** Identifiant de l'offre en mode modification (fourni par le routeur). */
  readonly id = input<string | undefined>(undefined);

  readonly reference = this.referenceData.data;
  readonly loading = signal(false);
  readonly saving = signal(false);

  readonly isEdit = computed(() => Boolean(this.id()));

  readonly skills = signal<string[]>([]);
  readonly responsibilities = signal<string[]>([]);

  readonly jobStatus = JobStatus;
  readonly today = new Date();

  readonly form = this.fb.nonNullable.group(
    {
      title: ['', [Validators.required, Validators.maxLength(140)]],
      domain: ['', [Validators.required]],
      sector: ['', [Validators.required]],
      city: ['', [Validators.required]],
      country: ['Canada', [Validators.required]],
      salaryMin: [0, [Validators.required, Validators.min(0)]],
      salaryMax: [0, [Validators.required, Validators.min(0)]],
      contractType: [ContractType.FullTime, [Validators.required]],
      workMode: [WorkMode.OnSite, [Validators.required]],
      startDate: [null as Date | null, [Validators.required]],
      displayUntil: [null as Date | null, [Validators.required]],
      description: ['', [Validators.required, Validators.minLength(30)]],
      status: [JobStatus.Published as JobStatus, [Validators.required]],
    },
    { validators: salaryRange('salaryMin', 'salaryMax') },
  );

  constructor() {
    this.referenceData.load().subscribe();
  }

  ngOnInit(): void {
    const id = this.id();
    if (id) {
      this.loadJob(id);
    }
  }

  errorFor(control: string, label: string): string {
    return formErrorMessage(this.form.get(control), label);
  }

  private loadJob(id: string): void {
    this.loading.set(true);
    this.employerService.getJobDetails(id).subscribe({
      next: ({ job }) => {
        this.form.patchValue({
          title: job.title,
          domain: job.domain,
          sector: job.sector,
          city: job.city,
          country: job.country,
          salaryMin: job.salaryMin,
          salaryMax: job.salaryMax,
          contractType: job.contractType,
          workMode: job.workMode,
          description: job.description,
          status: job.status,
          startDate: fromDateOnly(job.startDate),
          displayUntil: fromDateOnly(job.displayUntil),
        });
        this.skills.set([...job.requiredSkills]);
        this.responsibilities.set([...job.responsibilities]);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        void this.router.navigate(['/entreprise/offres']);
      },
    });
  }

  /** Enregistre l'offre. `publish` force le statut publie depuis le bouton dedie. */
  save(publish?: boolean): void {
    if (publish !== undefined) {
      this.form.patchValue({ status: publish ? JobStatus.Published : JobStatus.Draft });
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.notifications.error('Certains champs sont incomplets ou invalides.');
      return;
    }

    const value = this.form.getRawValue();
    const request = {
      title: value.title,
      domain: value.domain,
      sector: value.sector,
      city: value.city,
      country: value.country,
      salaryMin: value.salaryMin,
      salaryMax: value.salaryMax,
      contractType: value.contractType,
      workMode: value.workMode,
      startDate: toDateOnly(value.startDate)!,
      displayUntil: toDateOnly(value.displayUntil)!,
      description: value.description,
      requiredSkills: this.skills(),
      responsibilities: this.responsibilities(),
      status: value.status,
    };

    this.saving.set(true);
    const id = this.id();
    const call = id
      ? this.employerService.updateJob(id, request)
      : this.employerService.createJob(request);

    call.subscribe({
      next: (job) => {
        this.saving.set(false);
        this.notifications.success(id ? 'Offre mise a jour.' : 'Offre creee.');
        void this.router.navigate(['/entreprise/offres', job.id]);
      },
      error: () => this.saving.set(false),
    });
  }
}
