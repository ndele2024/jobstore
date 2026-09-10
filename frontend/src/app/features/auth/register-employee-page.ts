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
import { formErrorMessage, matchFields, phoneNumber, strongPassword } from '../../core/utils/form.validators';

/** Inscription d'un candidat, suivie de la verification du courriel. */
@Component({
  selector: 'app-register-employee-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatAutocompleteModule,
  ],
  templateUrl: './register-employee-page.html',
  styleUrl: './auth-shell.scss',
})
export class RegisterEmployeePage {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly flow = inject(VerificationFlowService);
  private readonly router = inject(Router);
  private readonly referenceData = inject(ReferenceDataService);

  readonly submitting = signal(false);
  readonly errorMessage = signal('');
  readonly hidePassword = signal(true);
  readonly reference = this.referenceData.data;

  readonly form = this.fb.nonNullable.group(
    {
      firstName: ['', [Validators.required, Validators.maxLength(80)]],
      lastName: ['', [Validators.required, Validators.maxLength(80)]],
      email: ['', [Validators.required, Validators.email]],
      phone: ['', [Validators.required, phoneNumber()]],
      addressLine: [''],
      city: ['', [Validators.required]],
      country: ['Canada', [Validators.required]],
      postalCode: [''],
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
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    this.errorMessage.set('');

    this.auth.registerEmployee(this.form.getRawValue()).subscribe({
      next: (challenge) => {
        this.submitting.set(false);
        this.flow.start(challenge, 'registration', '/candidat/profil');
        void this.router.navigate(['/verification']);
      },
      error: (error: HttpErrorResponse) => {
        this.submitting.set(false);
        this.errorMessage.set(extractMessage(error));
      },
    });
  }
}
