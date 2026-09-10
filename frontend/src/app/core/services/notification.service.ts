import { Injectable, inject } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';

/**
 * Point unique pour les messages transitoires (succes / erreur / information).
 * Utiliser ce service plutot que MatSnackBar directement, pour garder un style homogene.
 */
@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly snackBar = inject(MatSnackBar);

  success(message: string): void {
    this.open(message, 'snack-success', 4000);
  }

  error(message: string): void {
    this.open(message, 'snack-error', 7000);
  }

  info(message: string): void {
    this.open(message, 'snack-info', 5000);
  }

  private open(message: string, panelClass: string, duration: number): void {
    this.snackBar.open(message, 'Fermer', {
      duration,
      panelClass: [panelClass],
      horizontalPosition: 'center',
      verticalPosition: 'top',
    });
  }
}
