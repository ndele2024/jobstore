import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import {
  JobDetails,
  JobSearchCriteria,
  JobSearchResponse,
  MyApplication,
  SubmitApplicationRequest,
} from '../models/api.models';

/** Recherche publique d'offres, detail d'une offre et depot de candidature. */
@Injectable({ providedIn: 'root' })
export class JobsService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/jobs`;

  search(criteria: JobSearchCriteria): Observable<JobSearchResponse> {
    let params = new HttpParams();

    // Les criteres vides ne sont pas envoyes: l'API applique alors ses valeurs par defaut.
    Object.entries(criteria).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== '') {
        params = params.set(key, String(value));
      }
    });

    return this.http.get<JobSearchResponse>(this.baseUrl, { params });
  }

  getById(jobId: string): Observable<JobDetails> {
    return this.http.get<JobDetails>(`${this.baseUrl}/${jobId}`);
  }

  apply(jobId: string, request: SubmitApplicationRequest): Observable<MyApplication> {
    return this.http.post<MyApplication>(`${this.baseUrl}/${jobId}/apply`, request);
  }
}
