import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';

import { AuthService } from '../services/auth.service';
import { NotificationService } from '../services/notification.service';

/**
 * Traduit les erreurs HTTP en messages lisibles et gere la deconnexion automatique.
 *
 * L'erreur est toujours repropagee: un composant peut donc afficher
 * un message specifique en plus de la notification globale.
 */
export const errorInterceptor: HttpInterceptorFn = (request, next) => {
  const notifications = inject(NotificationService);
  const auth = inject(AuthService);
  const router = inject(Router);

  return next(request).pipe(
    catchError((error: HttpErrorResponse) => {
      const message = extractMessage(error);

      if (error.status === 401 && auth.isAuthenticated()) {
        notifications.error('Votre session a expire. Merci de vous reconnecter.');
        auth.logout(false);
        void router.navigate(['/connexion']);
        return throwError(() => error);
      }

      // Le 401 d'un formulaire de connexion est affiche par le composant lui-meme.
      const handledByComponent =
        error.status === 401 && request.url.includes('/auth/');

      if (!handledByComponent) {
        notifications.error(message);
      }

      return throwError(() => error);
    }),
  );
};

/** Recupere le message le plus utile disponible dans la reponse d'erreur. */
export function extractMessage(error: HttpErrorResponse): string {
  if (error.status === 0) {
    return "Impossible de joindre le serveur. Verifiez que l'API JobStore est demarree.";
  }

  const body = error.error as { message?: string; errors?: Record<string, string[]> } | string | null;

  if (typeof body === 'string' && body.trim().length > 0) {
    return body;
  }

  if (body && typeof body === 'object') {
    if (body.message) {
      return body.message;
    }

    const first = body.errors ? Object.values(body.errors).flat()[0] : undefined;
    if (first) {
      return first;
    }
  }

  switch (error.status) {
    case 403:
      return "Vous n'avez pas les droits necessaires pour cette action.";
    case 404:
      return 'Ressource introuvable.';
    case 413:
      return 'Le fichier envoye est trop volumineux.';
    default:
      return 'Une erreur inattendue est survenue. Reessayez dans un instant.';
  }
}
