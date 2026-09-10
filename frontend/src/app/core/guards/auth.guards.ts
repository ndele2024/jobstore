import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { UserRole } from '../models/api.models';
import { AuthService } from '../services/auth.service';
import { NotificationService } from '../services/notification.service';

/** Reserve une route aux utilisateurs connectes; memorise la page demandee. */
export const authGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (auth.isAuthenticated()) {
    return true;
  }

  return router.createUrlTree(['/connexion'], { queryParams: { redirect: state.url } });
};

/** Reserve une route a un role precis. Redirige vers l'accueil du role reel. */
export function roleGuard(role: UserRole): CanActivateFn {
  return (_route, state) => {
    const auth = inject(AuthService);
    const router = inject(Router);
    const notifications = inject(NotificationService);

    if (!auth.isAuthenticated()) {
      return router.createUrlTree(['/connexion'], { queryParams: { redirect: state.url } });
    }

    if (auth.role() === role) {
      return true;
    }

    notifications.error("Cette section n'est pas accessible avec votre type de compte.");
    return router.parseUrl(auth.homeRoute());
  };
}

/** Empeche un utilisateur deja connecte d'ouvrir les pages de connexion / inscription. */
export const guestGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  return auth.isAuthenticated() ? router.parseUrl(auth.homeRoute()) : true;
};
