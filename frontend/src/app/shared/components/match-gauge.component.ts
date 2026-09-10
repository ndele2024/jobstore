import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { MatTooltipModule } from '@angular/material/tooltip';

import { matchTone } from '../../core/utils/labels';

/**
 * Jauge circulaire du pourcentage de correspondance profil / offre.
 * Le detail (competences trouvees / manquantes) est affiche en infobulle.
 */
@Component({
  selector: 'app-match-gauge',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatTooltipModule],
  template: `
    <div
      class="gauge"
      [class]="tone()"
      [style.--value]="value()"
      [matTooltip]="tooltip()"
      matTooltipPosition="above"
      [attr.aria-label]="'Correspondance ' + value() + ' pour cent'"
      role="img"
    >
      <span class="gauge__value">{{ value() }}<small>%</small></span>
    </div>
  `,
  styles: [
    `
      .gauge {
        --size: 56px;
        position: relative;
        width: var(--size);
        height: var(--size);
        border-radius: 50%;
        display: grid;
        place-items: center;
        background: conic-gradient(
          var(--gauge-color) calc(var(--value) * 1%),
          var(--jb-surface-alt) 0
        );
        flex: none;
      }

      .gauge::after {
        content: '';
        position: absolute;
        inset: 5px;
        border-radius: 50%;
        background: var(--jb-surface);
      }

      .gauge__value {
        position: relative;
        z-index: 1;
        font-size: 0.85rem;
        font-weight: 700;
        color: var(--gauge-color);
      }

      .gauge__value small {
        font-size: 0.6rem;
        font-weight: 600;
      }

      .gauge.large {
        --size: 92px;
      }
      .gauge.large .gauge__value {
        font-size: 1.35rem;
      }

      .tone-success {
        --gauge-color: var(--jb-success);
      }
      .tone-warn {
        --gauge-color: var(--jb-warn);
      }
      .tone-danger {
        --gauge-color: var(--jb-danger);
      }
      .tone-neutral {
        --gauge-color: var(--jb-muted);
      }
    `,
  ],
})
export class MatchGaugeComponent {
  readonly percentage = input<number | null>(null);
  readonly matchedSkills = input<string[]>([]);
  readonly missingSkills = input<string[]>([]);
  readonly size = input<'default' | 'large'>('default');

  readonly value = computed(() => this.percentage() ?? 0);
  readonly tone = computed(() => `${matchTone(this.percentage())} ${this.size() === 'large' ? 'large' : ''}`);

  readonly tooltip = computed(() => {
    const matched = this.matchedSkills();
    const missing = this.missingSkills();
    const parts = [`Correspondance profil / offre : ${this.value()} %`];

    if (matched.length) parts.push(`Acquis : ${matched.join(', ')}`);
    if (missing.length) parts.push(`A developper : ${missing.join(', ')}`);

    return parts.join('\n');
  });
}
