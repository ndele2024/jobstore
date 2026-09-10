import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { Router } from '@angular/router';

import { extractMessage } from '../../core/interceptors/error.interceptor';
import { AuthService } from '../../core/services/auth.service';
import { NotificationService } from '../../core/services/notification.service';
import { VerificationFlowService } from '../../core/services/verification-flow.service';
import { verificationCode } from '../../core/utils/form.validators';

/**
 * Etape 2 commune a l'inscription, a la connexion et au changement de courriel:
 * saisie du code a 6 chiffres recu par courriel.
 */
@Component({
  selector: 'app-verify-code-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
  ],
  templateUrl: './verify-code-page.html',
  styleUrl: './auth-shell.scss',
})
export class VerifyCodePage {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly flow = inject(VerificationFlowService);
  private readonly router = inject(Router);
  private readonly notifications = inject(NotificationService);

  readonly submitting = signal(false);
  readonly resending = signal(false);
  readonly errorMessage = signal('');

  readonly pending = this.flow.pending;

  readonly title = computed(() => {
    switch (this.pending()?.context) {
      case 'registration':
        return 'Activez votre compte';
      case 'email-change':
        return 'Confirmez votre nouvelle adresse';
      default:
        return 'Vérification en deux étapes';
    }
  });

  readonly form = this.fb.nonNullable.group({
    code: ['', [Validators.required, verificationCode()]],
  });

  constructor() {
    // Sans defi en cours, la page n'a pas de sens: on repart de la connexion.
    if (!this.flow.hasPending()) {
      void this.router.navigate(['/connexion']);
    }
  }

  submit(): void {
    const pending = this.pending();
    if (!pending || this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    this.errorMessage.set('');

    this.auth
      .verifyCode({ challengeId: pending.challenge.challengeId, code: this.form.getRawValue().code })
      .subscribe({
        next: () => {
          this.submitting.set(false);
          this.flow.clear();
          this.notifications.success('Verification reussie. Bienvenue sur JobStore.');
          void this.router.navigateByUrl(pending.redirectTo || this.auth.homeRoute());
        },
        error: (error: HttpErrorResponse) => {
          this.submitting.set(false);
          this.errorMessage.set(extractMessage(error));
        },
      });
  }

  resend(): void {
    const pending = this.pending();
    if (!pending) {
      return;
    }

    this.resending.set(true);
    this.auth.resendCode(pending.challenge.challengeId).subscribe({
      next: (challenge) => {
        this.resending.set(false);
        this.flow.refresh(challenge);
        this.form.reset({ code: '' });
        this.notifications.info('Un nouveau code vient de vous etre envoye.');
      },
      error: () => this.resending.set(false),
    });
  }

  cancel(): void {
    this.flow.clear();
    void this.router.navigate(['/connexion']);
  }
}
