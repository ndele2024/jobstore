import { Injectable, computed, signal } from '@angular/core';

import { VerificationChallenge } from '../models/api.models';

const STORAGE_KEY = 'jobstore.challenge';

export type VerificationContext = 'registration' | 'login' | 'email-change';

export interface PendingVerification {
  challenge: VerificationChallenge;
  context: VerificationContext;
  /** Route a ouvrir apres une verification reussie. */
  redirectTo?: string | null;
}

/**
 * Memorise le defi de verification en cours (code a 6 chiffres) entre deux pages.
 *
 * Stocke dans sessionStorage: l'utilisateur peut rafraichir la page
 * de saisie du code sans perdre son parcours.
 */
@Injectable({ providedIn: 'root' })
export class VerificationFlowService {
  private readonly _pending = signal<PendingVerification | null>(read());

  readonly pending = this._pending.asReadonly();
  readonly hasPending = computed(() => this._pending() !== null);

  start(challenge: VerificationChallenge, context: VerificationContext, redirectTo?: string | null): void {
    const value: PendingVerification = { challenge, context, redirectTo: redirectTo ?? null };
    this._pending.set(value);
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  }

  /** Met a jour le defi apres un renvoi de code, en conservant le contexte. */
  refresh(challenge: VerificationChallenge): void {
    const current = this._pending();
    if (!current) {
      return;
    }
    this.start(challenge, current.context, current.redirectTo);
  }

  clear(): void {
    this._pending.set(null);
    sessionStorage.removeItem(STORAGE_KEY);
  }
}

function read(): PendingVerification | null {
  const raw = sessionStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as PendingVerification;
  } catch {
    sessionStorage.removeItem(STORAGE_KEY);
    return null;
  }
}
