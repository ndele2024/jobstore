import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';

export interface ConfirmDialogData {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
}

/**
 * Boite de dialogue de confirmation reutilisable.
 *
 * Exemple:
 *   this.dialog.open(ConfirmDialogComponent, { data: { title: '...', message: '...' } })
 *     .afterClosed().subscribe(confirmed => ...);
 */
@Component({
  selector: 'app-confirm-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatDialogModule, MatButtonModule],
  template: `
    <h2 mat-dialog-title>{{ data.title }}</h2>
    <mat-dialog-content>
      <p class="confirm__message">{{ data.message }}</p>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button matButton (click)="close(false)">{{ data.cancelLabel ?? 'Annuler' }}</button>
      <button
        matButton="filled"
        [class.danger-action]="data.danger"
        (click)="close(true)"
        cdkFocusInitial
      >
        {{ data.confirmLabel ?? 'Confirmer' }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [
    `
      .confirm__message {
        margin: 0;
        max-width: 46ch;
        line-height: 1.55;
      }
    `,
  ],
})
export class ConfirmDialogComponent {
  readonly data = inject<ConfirmDialogData>(MAT_DIALOG_DATA);
  private readonly dialogRef = inject(MatDialogRef<ConfirmDialogComponent, boolean>);

  close(result: boolean): void {
    this.dialogRef.close(result);
  }
}
