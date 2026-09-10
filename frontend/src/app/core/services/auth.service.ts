import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';

import { environment } from '../../../environments/environment';
import {
  AuthResponse,
  AuthUser,
  ChangeEmailRequest,
  ChangePasswordRequest,
  LoginRequest,
  RegisterEmployeeRequest,
  RegisterEmployerRequest,
  UserRole,
  VerificationChallenge,
  VerifyCodeRequest,
} from '../models/api.models';

const TOKEN_KEY = 'jobstore.token';
const USER_KEY = 'jobstore.user';

/**
 * Etat d'authentification de l'application.
 *
 * La session est conservee dans le localStorage pour survivre a un rechargement.
 * L'etat est expose sous forme de signaux, consommes directement par les templates.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);

  private readonly baseUrl = `${environment.apiBaseUrl}/auth`;

  private readonly _user = signal<AuthUser | null>(readStoredUser());
  private readonly _token = signal<string | null>(localStorage.getItem(TOKEN_KEY));

  /** Utilisateur connecte, ou null. */
  readonly user = this._user.asReadonly();
  readonly isAuthenticated = computed(() => this._user() !== null);
  readonly role = computed(() => this._user()?.role ?? null);
  readonly isEmployee = computed(() => this.role() === UserRole.Employee);
  readonly isEmployer = computed(() => this.role() === UserRole.Employer);
  readonly isAdmin = computed(() => this.role() === UserRole.Admin);

  /** Route d'accueil correspondant au role connecte. */
  readonly homeRoute = computed(() => {
    switch (this.role()) {
      case UserRole.Employee:
        return '/candidat/tableau-de-bord';
      case UserRole.Employer:
        return '/entreprise/tableau-de-bord';
      case UserRole.Admin:
        return '/administration';
      default:
        return '/';
    }
  });

  get token(): string | null {
    return this._token();
  }

  // -- Inscription --------------------------------------------------------

  registerEmployee(request: RegisterEmployeeRequest): Observable<VerificationChallenge> {
    return this.http.post<VerificationChallenge>(`${this.baseUrl}/register/employee`, request);
  }

  registerEmployer(request: RegisterEmployerRequest): Observable<VerificationChallenge> {
    return this.http.post<VerificationChallenge>(`${this.baseUrl}/register/employer`, request);
  }

  // -- Connexion en deux etapes -------------------------------------------

  /** Etape 1: verifie le mot de passe et declenche l'envoi du code a 6 chiffres. */
  login(request: LoginRequest): Observable<VerificationChallenge> {
    return this.http.post<VerificationChallenge>(`${this.baseUrl}/login`, request);
  }

  /** Etape 2: confirme le code, memorise le jeton et l'utilisateur. */
  verifyCode(request: VerifyCodeRequest): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${this.baseUrl}/verify`, request)
      .pipe(tap((response) => this.storeSession(response)));
  }

  resendCode(challengeId: string): Observable<VerificationChallenge> {
    return this.http.post<VerificationChallenge>(`${this.baseUrl}/resend-code`, { challengeId });
  }

  // -- Compte -------------------------------------------------------------

  changeEmail(request: ChangeEmailRequest): Observable<VerificationChallenge> {
    return this.http.post<VerificationChallenge>(`${this.baseUrl}/change-email`, request);
  }

  changePassword(request: ChangePasswordRequest): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/change-password`, request);
  }

  /** Recharge l'utilisateur depuis l'API (utile apres un changement de courriel). */
  refreshCurrentUser(): Observable<AuthUser> {
    return this.http.get<AuthUser>(`${this.baseUrl}/me`).pipe(
      tap((user) => {
        this._user.set(user);
        localStorage.setItem(USER_KEY, JSON.stringify(user));
      }),
    );
  }

  storeSession(response: AuthResponse): void {
    localStorage.setItem(TOKEN_KEY, response.accessToken);
    localStorage.setItem(USER_KEY, JSON.stringify(response.user));
    this._token.set(response.accessToken);
    this._user.set(response.user);
  }

  logout(redirect = true): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    this._token.set(null);
    this._user.set(null);

    if (redirect) {
      void this.router.navigate(['/connexion']);
    }
  }
}

function readStoredUser(): AuthUser | null {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    localStorage.removeItem(USER_KEY);
    return null;
  }
}
