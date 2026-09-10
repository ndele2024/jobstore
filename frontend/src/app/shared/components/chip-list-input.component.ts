import { COMMA, ENTER } from '@angular/cdk/keycodes';
import { ChangeDetectionStrategy, Component, computed, input, model, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatAutocompleteModule, MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { MatChipInputEvent, MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';

/**
 * Saisie d'une liste de valeurs sous forme de puces (competences, taches, secteurs...).
 *
 * Le tableau est lie en two-way binding:
 *   <app-chip-list-input [(values)]="skills" [suggestions]="referenceSkills" />
 */
@Component({
  selector: 'app-chip-list-input',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatChipsModule,
    MatIconModule,
    MatAutocompleteModule,
  ],
  template: `
    <mat-form-field appearance="outline" class="full-width">
      <mat-label>{{ label() }}</mat-label>

      <mat-chip-grid #chipGrid [attr.aria-label]="label()">
        @for (value of values(); track value) {
          <mat-chip-row (removed)="remove(value)">
            {{ value }}
            <button matChipRemove [attr.aria-label]="'Retirer ' + value">
              <mat-icon>cancel</mat-icon>
            </button>
          </mat-chip-row>
        }
      </mat-chip-grid>

      <input
        [placeholder]="placeholder()"
        [matChipInputFor]="chipGrid"
        [matChipInputSeparatorKeyCodes]="separators"
        [matAutocomplete]="auto"
        [(ngModel)]="query"
        [ngModelOptions]="{ standalone: true }"
        (matChipInputTokenEnd)="add($event)"
      />

      <mat-autocomplete #auto="matAutocomplete" (optionSelected)="selected($event)">
        @for (option of filteredSuggestions(); track option) {
          <mat-option [value]="option">{{ option }}</mat-option>
        }
      </mat-autocomplete>

      @if (hint()) {
        <mat-hint>{{ hint() }}</mat-hint>
      }
    </mat-form-field>
  `,
})
export class ChipListInputComponent {
  readonly values = model<string[]>([]);
  readonly label = input('Elements');
  readonly placeholder = input('Ajouter puis Entree');
  readonly hint = input('');
  readonly suggestions = input<string[]>([]);

  readonly separators: number[] = [ENTER, COMMA];
  readonly query = signal('');

  /** Suggestions restantes, filtrees par la saisie en cours. */
  readonly filteredSuggestions = computed(() => {
    const selected = this.values().map((v) => v.toLowerCase());
    const search = this.query().toLowerCase().trim();

    return this.suggestions()
      .filter((option) => !selected.includes(option.toLowerCase()))
      .filter((option) => !search || option.toLowerCase().includes(search))
      .slice(0, 12);
  });

  add(event: MatChipInputEvent): void {
    this.push(event.value);
    event.chipInput.clear();
    this.query.set('');
  }

  selected(event: MatAutocompleteSelectedEvent): void {
    this.push(event.option.viewValue);
    this.query.set('');
  }

  remove(value: string): void {
    this.values.update((items) => items.filter((item) => item !== value));
  }

  private push(raw: string): void {
    const value = raw.trim();
    if (!value) {
      return;
    }

    const exists = this.values().some((item) => item.toLowerCase() === value.toLowerCase());
    if (!exists) {
      this.values.update((items) => [...items, value]);
    }
  }
}
