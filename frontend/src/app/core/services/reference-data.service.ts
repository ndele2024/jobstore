import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, of, shareReplay, tap } from 'rxjs';

import { environment } from '../../../environments/environment';
import { ReferenceData } from '../models/api.models';

const EMPTY_REFERENCE_DATA: ReferenceData = {
  domains: [],
  sectors: [],
  cities: [],
  countries: [],
  diplomas: [],
  languages: [],
  skills: [],
  languageLevels: [],
  contractTypes: [],
  workModes: [],
  jobStatuses: [],
  applicationStatuses: [],
};

/**
 * Listes de reference (domaines, secteurs, villes, diplomes, libelles d'enums).
 * Chargees une seule fois puis partagees par tous les formulaires.
 */
@Injectable({ providedIn: 'root' })
export class ReferenceDataService {
  private readonly http = inject(HttpClient);

  private readonly _data = signal<ReferenceData>(EMPTY_REFERENCE_DATA);
  private request$?: Observable<ReferenceData>;

  /** Donnees de reference courantes, utilisables directement dans les templates. */
  readonly data = this._data.asReadonly();

  load(): Observable<ReferenceData> {
    if (this._data().domains.length > 0) {
      return of(this._data());
    }

    this.request$ ??= this.http.get<ReferenceData>(`${environment.apiBaseUrl}/reference-data`).pipe(
      tap((data) => this._data.set(data)),
      shareReplay({ bufferSize: 1, refCount: false }),
    );

    return this.request$;
  }
}
