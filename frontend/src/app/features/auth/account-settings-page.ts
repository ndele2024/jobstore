import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { Router } from '@angular/router';

import { AuthService } from '../../core/services/auth.service';
import { NotificationService } from '../../core/services/notification.service';
import { VerificationFlowService } from '../../core/services/verification-flow.service';
import { formErrorMessage, matchFields, strongPassword } from '../../core/utils/form.validators';
import { UserRolePipe } from '../../shared/pipes/labels.pipes';

/**
 * Parametres du compte, accessibles a tous les roles:
 * changement d'adresse courriel (confirme par code) et changement de mot de passe.
 */
@Component({
  selector: 'app-account-settings-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    UserRolePipe,
  ],
  templateUrl: './account-settings-page.html',
})
export class AccountSettingsPage {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly flow = inject(VerificationFlowService);
  private readonly router = inject(Router);
  private readonly notifications = inject(NotificationService);

  readonly user = this.auth.user;
  readonly savingEmail = signal(false);
  readonly savingPassword = signal(false);

  readonly emailForm = this.fb.nonNullable.group({
    newEmail: ['', [Validators.required, Validators.email]],
    currentPassword: ['', [Validators.required]],
  });

  readonly passwordForm = this.fb.nonNullable.group(
    {
      currentPassword: ['', [Validators.required]],
      newPassword: ['', [Validators.required, strongPassword()]],
      confirmPassword: ['', [Validators.required]],
    },
    { validators: matchFields('newPassword', 'confirmPassword') },
  );

  emailError(control: string, label: string): string {
    return formErrorMessage(this.emailForm.get(control), label);
  }

  passwordError(control: string, label: string): string {
    return formErrorMessage(this.passwordForm.get(control), label);
  }

  submitEmail(): void {
    if (this.emailForm.invalid) {
      this.emailForm.markAllAsTouched();
      return;
    }

    this.savingEmail.set(true);
    this.auth.changeEmail(this.emailForm.getRawValue()).subscribe({
      next: (challenge) => {
        this.savingEmail.set(false);
        this.flow.start(challenge, 'email-change', '/mon-compte');
        void this.router.navigate(['/verification']);
      },
      error: () => this.savingEmail.set(false),
    });
  }

  submitPassword(): void {
    if (this.passwordForm.invalid) {
      this.passwordForm.markAllAsTouched();
      return;
    }

    this.savingPassword.set(true);
    this.auth.changePassword(this.passwordForm.getRawValue()).subscribe({
      next: () => {
        this.savingPassword.set(false);
        this.passwordForm.reset();
        this.notifications.success('Mot de passe mis a jour.');
      },
      error: () => this.savingPassword.set(false),
    });
  }
}
