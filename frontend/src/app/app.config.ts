import { registerLocaleData } from '@angular/common';
import localeFrCa from '@angular/common/locales/fr-CA';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import {
  ApplicationConfig,
  LOCALE_ID,
  provideBrowserGlobalErrorListeners,
  provideZonelessChangeDetection,
} from '@angular/core';
import { MAT_FORM_FIELD_DEFAULT_OPTIONS } from '@angular/material/form-field';
import { MAT_ICON_DEFAULT_OPTIONS } from '@angular/material/icon';
import { MAT_DATE_LOCALE, provideNativeDateAdapter } from '@angular/material/core';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideRouter, withComponentInputBinding, withInMemoryScrolling } from '@angular/router';

import { routes } from './app.routes';
import { authInterceptor } from './core/interceptors/auth.interceptor';
import { errorInterceptor } from './core/interceptors/error.interceptor';
import { loadingInterceptor } from './core/interceptors/loading.interceptor';

/**
 * Configuration racine de l'application.
 *
 * - detection de changement sans zone.js (signaux)
 * - trois intercepteurs HTTP: jeton, indicateur de chargement, gestion des erreurs
 * - champs de formulaire en style "outline" et icones Material Symbols par defaut
 */
// Les dates et nombres sont formates en francais canadien dans toute l'application.
// Sans cet enregistrement, DatePipe leve NG0701 et interrompt le rendu du gabarit.
registerLocaleData(localeFrCa, 'fr-CA');

export const appConfig: ApplicationConfig = {
  providers: [
    { provide: LOCALE_ID, useValue: 'fr-CA' },
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),
    provideAnimationsAsync(),

    provideRouter(
      routes,
      withComponentInputBinding(),
      withInMemoryScrolling({ scrollPositionRestoration: 'top', anchorScrolling: 'enabled' }),
    ),

    provideHttpClient(withInterceptors([authInterceptor, loadingInterceptor, errorInterceptor])),

    provideNativeDateAdapter(),
    { provide: MAT_DATE_LOCALE, useValue: 'fr-CA' },

    {
      provide: MAT_FORM_FIELD_DEFAULT_OPTIONS,
      useValue: { appearance: 'outline', subscriptSizing: 'dynamic' },
    },
    {
      provide: MAT_ICON_DEFAULT_OPTIONS,
      useValue: { fontSet: 'material-symbols-outlined' },
    },
  ],
};
