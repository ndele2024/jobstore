import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatTableModule } from '@angular/material/table';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTooltipModule } from '@angular/material/tooltip';

import { AdminDashboard, AdminUser } from '../../core/models/api.models';
import { AdminService } from '../../core/services/admin.service';
import { NotificationService } from '../../core/services/notification.service';
import { EmptyStateComponent } from '../../shared/components/empty-state.component';
import { TimeAgoPipe } from '../../shared/pipes/labels.pipes';

/**
 * Administration: vue d'ensemble de la plateforme et gestion des comptes.
 * L'activation/desactivation d'un compte bloque ou rouvre la connexion.
 */
@Component({
  selector: 'app-admin-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatTabsModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatSlideToggleModule,
    MatTooltipModule,
    MatProgressSpinnerModule,
    EmptyStateComponent,
    TimeAgoPipe,
  ],
  templateUrl: './admin-page.html',
  styleUrl: './admin-page.scss',
})
export class AdminPage {
  private readonly adminService = inject(AdminService);
  private readonly notifications = inject(NotificationService);

  readonly dashboard = signal<AdminDashboard | null>(null);
  readonly employees = signal<AdminUser[]>([]);
  readonly employers = signal<AdminUser[]>([]);
  readonly admins = signal<AdminUser[]>([]);
  readonly loading = signal(true);

  readonly employeeColumns = ['name', 'contact', 'location', 'applications', 'verified', 'created', 'active'];
  readonly employerColumns = ['name', 'contact', 'location', 'offers', 'verified', 'created', 'active'];
  readonly adminColumns = ['name', 'contact', 'location', 'created'];

  constructor() {
    this.load();
  }

  toggleActivation(user: AdminUser, isActive: boolean): void {
    this.adminService.setActivation(user.id, isActive).subscribe({
      next: () => {
        this.notifications.success(
          `${user.displayName} : compte ${isActive ? 'active' : 'desactive'}.`,
        );
        this.load();
      },
      error: () => this.load(),
    });
  }

  private load(): void {
    this.loading.set(true);

    this.adminService.getDashboard().subscribe({
      next: (data) => {
        this.dashboard.set(data);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });

    this.adminService.getEmployees().subscribe({ next: (data) => this.employees.set(data) });
    this.adminService.getEmployers().subscribe({ next: (data) => this.employers.set(data) });
    this.adminService.getAdmins().subscribe({ next: (data) => this.admins.set(data) });
  }
}
