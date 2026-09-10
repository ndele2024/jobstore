import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { MainLayout } from './layout/main-layout';

/** Composant racine: delegue toute la mise en page a MainLayout. */
@Component({
  selector: 'app-root',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MainLayout, RouterOutlet],
  template: `
    <app-main-layout>
      <router-outlet />
    </app-main-layout>
  `,
})
export class App {}
