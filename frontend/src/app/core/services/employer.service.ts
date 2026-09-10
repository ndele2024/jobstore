import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import {
  EmployerDashboard,
  EmployerJobDetails,
  EmployerProfile,
  JobApplicant,
  JobCard,
  JobDetails,
  JobStatus,
  UpdateApplicationStatusRequest,
  UpdateEmployerInfoRequest,
  UpsertJobRequest,
} from '../models/api.models';

/** Espace entreprise: profil, offres, candidats et statistiques. */
@Injectable({ providedIn: 'root' })
export class EmployerService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/employer`;

  // -- Profil entreprise ---------------------------------------------------

  getProfile(): Observable<EmployerProfile> {
    return this.http.get<EmployerProfile>(`${this.baseUrl}/profile`);
  }

  updateProfile(request: UpdateEmployerInfoRequest): Observable<EmployerProfile> {
    return this.http.put<EmployerProfile>(`${this.baseUrl}/profile`, request);
  }

  // -- Tableau de bord -----------------------------------------------------

  getDashboard(): Observable<EmployerDashboard> {
    return this.http.get<EmployerDashboard>(`${this.baseUrl}/dashboard`);
  }

  // -- Offres --------------------------------------------------------------

  getJobs(status?: JobStatus | null): Observable<JobCard[]> {
    let params = new HttpParams();
    if (status) {
      params = params.set('status', status);
    }
    return this.http.get<JobCard[]>(`${this.baseUrl}/jobs`, { params });
  }

  getJobDetails(jobId: string): Observable<EmployerJobDetails> {
    return this.http.get<EmployerJobDetails>(`${this.baseUrl}/jobs/${jobId}`);
  }

  createJob(request: UpsertJobRequest): Observable<JobDetails> {
    return this.http.post<JobDetails>(`${this.baseUrl}/jobs`, request);
  }

  updateJob(jobId: string, request: UpsertJobRequest): Observable<JobDetails> {
    return this.http.put<JobDetails>(`${this.baseUrl}/jobs/${jobId}`, request);
  }

  updateJobStatus(jobId: string, status: JobStatus): Observable<JobDetails> {
    return this.http.patch<JobDetails>(`${this.baseUrl}/jobs/${jobId}/status`, { status });
  }

  deleteJob(jobId: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/jobs/${jobId}`);
  }

  // -- Candidatures --------------------------------------------------------

  updateApplicationStatus(
    applicationId: string,
    request: UpdateApplicationStatusRequest,
  ): Observable<JobApplicant> {
    return this.http.patch<JobApplicant>(
      `${this.baseUrl}/applications/${applicationId}/status`,
      request,
    );
  }

  downloadCandidateResume(candidateId: string, resumeId: string): Observable<Blob> {
    return this.http.get(`${this.baseUrl}/candidates/${candidateId}/resumes/${resumeId}`, {
      responseType: 'blob',
    });
  }
}
