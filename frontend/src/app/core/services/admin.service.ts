import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { AdminDashboard, AdminUser } from '../models/api.models';

/** Administration de la plateforme. */
@Injectable({ providedIn: 'root' })
export class AdminService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/admin`;

  getDashboard(): Observable<AdminDashboard> {
    return this.http.get<AdminDashboard>(`${this.baseUrl}/dashboard`);
  }

  getEmployees(): Observable<AdminUser[]> {
    return this.http.get<AdminUser[]>(`${this.baseUrl}/users/employees`);
  }

  getEmployers(): Observable<AdminUser[]> {
    return this.http.get<AdminUser[]>(`${this.baseUrl}/users/employers`);
  }

  getAdmins(): Observable<AdminUser[]> {
    return this.http.get<AdminUser[]>(`${this.baseUrl}/users/admins`);
  }

  setActivation(userId: string, isActive: boolean): Observable<void> {
    const params = new HttpParams().set('isActive', isActive);
    return this.http.patch<void>(`${this.baseUrl}/users/${userId}/activation`, {}, { params });
  }
}
