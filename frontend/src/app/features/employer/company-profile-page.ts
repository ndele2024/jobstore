import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { EmployerProfile } from '../../core/models/api.models';
import { EmployerService } from '../../core/services/employer.service';
import { NotificationService } from '../../core/services/notification.service';
import { ReferenceDataService } from '../../core/services/reference-data.service';
import { formErrorMessage, phoneNumber } from '../../core/utils/form.validators';
import { ChipListInputComponent } from '../../shared/components/chip-list-input.component';

/** Profil de l'entreprise: coordonnees, secteurs d'activite et presentation. */
@Component({
  selector: 'app-company-profile-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatAutocompleteModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    ChipListInputComponent,
  ],
  templateUrl: './company-profile-page.html',
})
export class CompanyProfilePage {
  private readonly fb = inject(FormBuilder);
  private readonly employerService = inject(EmployerService);
  private readonly referenceData = inject(ReferenceDataService);
  private readonly notifications = inject(NotificationService);

  readonly reference = this.referenceData.data;
  readonly profile = signal<EmployerProfile | null>(null);
  readonly loading = signal(true);
  readonly saving = signal(false);

  readonly sectors = signal<string[]>([]);
  readonly sectorsTouched = signal(false);

  readonly form = this.fb.nonNullable.group({
    companyName: ['', [Validators.required, Validators.maxLength(120)]],
    phone: ['', [Validators.required, phoneNumber()]],
    addressLine: [''],
    city: ['', [Validators.required]],
    country: ['', [Validators.required]],
    postalCode: [''],
    websiteUrl: [''],
    headline: ['', [Validators.maxLength(120)]],
    summary: ['', [Validators.maxLength(1200)]],
  });

  constructor() {
    this.referenceData.load().subscribe();
    this.load();
  }

  errorFor(control: string, label: string): string {
    return formErrorMessage(this.form.get(control), label);
  }

  private load(): void {
    this.loading.set(true);
    this.employerService.getProfile().subscribe({
      next: (profile) => {
        this.profile.set(profile);
        this.form.patchValue({
          companyName: profile.companyName,
          phone: profile.phone,
          addressLine: profile.addressLine,
          city: profile.city,
          country: profile.country,
          postalCode: profile.postalCode,
          websiteUrl: profile.websiteUrl,
          headline: profile.headline,
          summary: profile.summary,
        });
        this.sectors.set([...profile.sectors]);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  save(): void {
    this.sectorsTouched.set(true);

    if (this.form.invalid || this.sectors().length === 0) {
      this.form.markAllAsTouched();
      return;
    }

    this.saving.set(true);
    this.employerService
      .updateProfile({ ...this.form.getRawValue(), sectors: this.sectors() })
      .subscribe({
        next: (profile) => {
          this.profile.set(profile);
          this.saving.set(false);
          this.notifications.success('Profil de l’entreprise enregistre.');
        },
        error: () => this.saving.set(false),
      });
  }
}
