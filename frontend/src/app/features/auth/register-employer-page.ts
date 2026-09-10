import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { Router, RouterLink } from '@angular/router';

import { extractMessage } from '../../core/interceptors/error.interceptor';
import { AuthService } from '../../core/services/auth.service';
import { ReferenceDataService } from '../../core/services/reference-data.service';
import { VerificationFlowService } from '../../core/services/verification-flow.service';
import {
  formErrorMessage,
  matchFields,
  phoneNumber,
  strongPassword,
} from '../../core/utils/form.validators';
import { ChipListInputComponent } from '../../shared/components/chip-list-input.component';

/** Inscription d'une entreprise (plusieurs secteurs d'activite possibles). */
@Component({
  selector: 'app-register-employer-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatAutocompleteModule,
    ChipListInputComponent,
  ],
  templateUrl: './register-employer-page.html',
  styleUrl: './auth-shell.scss',
})
export class RegisterEmployerPage {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly flow = inject(VerificationFlowService);
  private readonly router = inject(Router);
  private readonly referenceData = inject(ReferenceDataService);

  readonly submitting = signal(false);
  readonly errorMessage = signal('');
  readonly hidePassword = signal(true);
  readonly reference = this.referenceData.data;

  /** Les secteurs sont geres hors du FormGroup, via le composant de puces. */
  readonly sectors = signal<string[]>([]);
  readonly sectorsTouched = signal(false);

  readonly form = this.fb.nonNullable.group(
    {
      companyName: ['', [Validators.required, Validators.maxLength(120)]],
      email: ['', [Validators.required, Validators.email]],
      phone: ['', [Validators.required, phoneNumber()]],
      addressLine: [''],
      city: ['', [Validators.required]],
      country: ['Canada', [Validators.required]],
      postalCode: [''],
      websiteUrl: [''],
      password: ['', [Validators.required, strongPassword()]],
      confirmPassword: ['', [Validators.required]],
    },
    { validators: matchFields('password', 'confirmPassword') },
  );

  constructor() {
    this.referenceData.load().subscribe();
  }

  errorFor(control: string, label: string): string {
    return formErrorMessage(this.form.get(control), label);
  }

  submit(): void {
    this.sectorsTouched.set(true);

    if (this.form.invalid || this.sectors().length === 0) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    this.errorMessage.set('');

    this.auth.registerEmployer({ ...this.form.getRawValue(), sectors: this.sectors() }).subscribe({
      next: (challenge) => {
        this.submitting.set(false);
        this.flow.start(challenge, 'registration', '/entreprise/tableau-de-bord');
        void this.router.navigate(['/verification']);
      },
      error: (error: HttpErrorResponse) => {
        this.submitting.set(false);
        this.errorMessage.set(extractMessage(error));
      },
    });
  }
}
