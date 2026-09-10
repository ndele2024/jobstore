import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';

import { environment } from '../../../environments/environment';
import {
  Certification,
  CertificationRequest,
  Education,
  EducationRequest,
  EmployeeProfile,
  Experience,
  ExperienceRequest,
  LanguageRequest,
  LanguageSkill,
  Resume,
  ResumeUploadResponse,
  UpdatePersonalInfoRequest,
} from '../models/api.models';

/**
 * Profil du candidat connecte.
 *
 * Le profil courant est mis en cache dans un signal: les differents onglets
 * de la page profil le partagent sans rappeler l'API a chaque navigation.
 */
@Injectable({ providedIn: 'root' })
export class ProfileService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/profile`;

  private readonly _profile = signal<EmployeeProfile | null>(null);
  readonly profile = this._profile.asReadonly();

  load(): Observable<EmployeeProfile> {
    return this.http.get<EmployeeProfile>(this.baseUrl).pipe(tap((p) => this._profile.set(p)));
  }

  clear(): void {
    this._profile.set(null);
  }

  updatePersonalInfo(request: UpdatePersonalInfoRequest): Observable<EmployeeProfile> {
    return this.http
      .put<EmployeeProfile>(`${this.baseUrl}/personal-info`, request)
      .pipe(tap((p) => this._profile.set(p)));
  }

  updateSkills(skills: string[]): Observable<EmployeeProfile> {
    return this.http
      .put<EmployeeProfile>(`${this.baseUrl}/skills`, { skills })
      .pipe(tap((p) => this._profile.set(p)));
  }

  // -- Etudes -------------------------------------------------------------

  addEducation(request: EducationRequest): Observable<Education> {
    return this.http.post<Education>(`${this.baseUrl}/educations`, request);
  }

  updateEducation(id: string, request: EducationRequest): Observable<Education> {
    return this.http.put<Education>(`${this.baseUrl}/educations/${id}`, request);
  }

  deleteEducation(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/educations/${id}`);
  }

  // -- Experiences --------------------------------------------------------

  addExperience(request: ExperienceRequest): Observable<Experience> {
    return this.http.post<Experience>(`${this.baseUrl}/experiences`, request);
  }

  updateExperience(id: string, request: ExperienceRequest): Observable<Experience> {
    return this.http.put<Experience>(`${this.baseUrl}/experiences/${id}`, request);
  }

  deleteExperience(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/experiences/${id}`);
  }

  // -- Langues ------------------------------------------------------------

  addLanguage(request: LanguageRequest): Observable<LanguageSkill> {
    return this.http.post<LanguageSkill>(`${this.baseUrl}/languages`, request);
  }

  updateLanguage(id: string, request: LanguageRequest): Observable<LanguageSkill> {
    return this.http.put<LanguageSkill>(`${this.baseUrl}/languages/${id}`, request);
  }

  deleteLanguage(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/languages/${id}`);
  }

  // -- Certifications -----------------------------------------------------

  addCertification(request: CertificationRequest): Observable<Certification> {
    return this.http.post<Certification>(`${this.baseUrl}/certifications`, request);
  }

  updateCertification(id: string, request: CertificationRequest): Observable<Certification> {
    return this.http.put<Certification>(`${this.baseUrl}/certifications/${id}`, request);
  }

  deleteCertification(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/certifications/${id}`);
  }

  // -- CV -----------------------------------------------------------------

  getResumes(): Observable<Resume[]> {
    return this.http.get<Resume[]>(`${this.baseUrl}/resumes`);
  }

  /** Televerse un CV et recupere les donnees detectees pour pre-remplir le profil. */
  uploadResume(file: File): Observable<ResumeUploadResponse> {
    const formData = new FormData();
    formData.append('file', file, file.name);
    return this.http.post<ResumeUploadResponse>(`${this.baseUrl}/resumes`, formData);
  }

  setDefaultResume(id: string): Observable<void> {
    return this.http.put<void>(`${this.baseUrl}/resumes/${id}/default`, {});
  }

  deleteResume(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/resumes/${id}`);
  }

  downloadResume(id: string): Observable<Blob> {
    return this.http.get(`${this.baseUrl}/resumes/${id}/download`, { responseType: 'blob' });
  }
}
