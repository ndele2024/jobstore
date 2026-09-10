import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { extractMessage } from '../../core/interceptors/error.interceptor';
import { AuthService } from '../../core/services/auth.service';
import { VerificationFlowService } from '../../core/services/verification-flow.service';
import { formErrorMessage } from '../../core/utils/form.validators';

/**
 * Etape 1 de la connexion: courriel + mot de passe.
 * En cas de succes, l'API envoie un code a 6 chiffres et on passe sur /verification.
 */
@Component({
  selector: 'app-login-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
  ],
  templateUrl: './login-page.html',
  styleUrl: './auth-shell.scss',
})
export class LoginPage {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly flow = inject(VerificationFlowService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly submitting = signal(false);
  readonly errorMessage = signal('');
  readonly hidePassword = signal(true);

  readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]],
  });

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

    const redirect = this.route.snapshot.queryParamMap.get('redirect');

    this.auth.login(this.form.getRawValue()).subscribe({
      next: (challenge) => {
        this.submitting.set(false);
        this.flow.start(challenge, 'login', redirect);
        void this.router.navigate(['/verification']);
      },
      error: (error: HttpErrorResponse) => {
        this.submitting.set(false);
        this.errorMessage.set(extractMessage(error));
      },
    });
  }
}
