import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

/** Bloc affiche quand une liste est vide, avec une action facultative projetee. */
@Component({
  selector: 'app-empty-state',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatIconModule],
  template: `
    <div class="empty">
      <mat-icon class="empty__icon">{{ icon() }}</mat-icon>
      <h3 class="empty__title">{{ title() }}</h3>
      @if (message()) {
        <p class="empty__message">{{ message() }}</p>
      }
      <ng-content />
    </div>
  `,
  styles: [
    `
      .empty {
        display: flex;
        flex-direction: column;
        align-items: center;
        text-align: center;
        gap: 0.5rem;
        padding: 3rem 1.5rem;
        color: var(--jb-muted);
      }

      .empty__icon {
        font-size: 3rem;
        width: 3rem;
        height: 3rem;
        opacity: 0.55;
      }

      .empty__title {
        margin: 0;
        font-size: 1.05rem;
        font-weight: 600;
        color: var(--jb-text);
      }

      .empty__message {
        margin: 0;
        max-width: 46ch;
        font-size: 0.9rem;
      }
    `,
  ],
})
export class EmptyStateComponent {
  readonly icon = input('inbox');
  readonly title = input('Aucun element');
  readonly message = input('');
}
