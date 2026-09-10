import { HttpInterceptorFn } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { finalize } from 'rxjs';

/** Compte les requetes HTTP en cours pour piloter la barre de progression globale. */
@Injectable({ providedIn: 'root' })
export class LoadingService {
  private readonly pending = signal(0);

  readonly isLoading = computed(() => this.pending() > 0);

  start(): void {
    this.pending.update((count) => count + 1);
  }

  stop(): void {
    this.pending.update((count) => Math.max(0, count - 1));
  }
}

export const loadingInterceptor: HttpInterceptorFn = (request, next) => {
  const loading = inject(LoadingService);
  loading.start();
  return next(request).pipe(finalize(() => loading.stop()));
};
