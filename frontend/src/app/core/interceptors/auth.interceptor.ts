import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';

import { AuthService } from '../services/auth.service';

/**
 * Ajoute le jeton JWT sur toutes les requetes vers l'API JobStore.
 * Les appels vers d'autres domaines ne sont pas modifies.
 */
export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const token = inject(AuthService).token;

  if (!token || !request.url.includes('/api/')) {
    return next(request);
  }

  return next(
    request.clone({
      setHeaders: { Authorization: `Bearer ${token}` },
    }),
  );
};
