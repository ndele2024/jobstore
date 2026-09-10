import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { ApplicationStatus, EmployeeDashboard, MyApplication } from '../models/api.models';

/** Espace candidat: tableau de bord et suivi des candidatures. */
@Injectable({ providedIn: 'root' })
export class EmployeeService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/employee`;

  getDashboard(): Observable<EmployeeDashboard> {
    return this.http.get<EmployeeDashboard>(`${this.baseUrl}/dashboard`);
  }

  getApplications(status?: ApplicationStatus | null): Observable<MyApplication[]> {
    let params = new HttpParams();
    if (status) {
      params = params.set('status', status);
    }
    return this.http.get<MyApplication[]>(`${this.baseUrl}/applications`, { params });
  }

  withdrawApplication(applicationId: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/applications/${applicationId}`);
  }
}
