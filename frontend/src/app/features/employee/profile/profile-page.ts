import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Observable, catchError, concat, defer, forkJoin, map, of, switchMap, toArray } from 'rxjs';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialog } from '@angular/material/dialog';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule } from '@angular/material/menu';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTooltipModule } from '@angular/material/tooltip';

import {
  Certification,
  Education,
  Experience,
  EmployeeProfile,
  LanguageSkill,
  Resume,
  ResumeAnalysis,
  UpdatePersonalInfoRequest,
} from '../../../core/models/api.models';
import { NotificationService } from '../../../core/services/notification.service';
import { ProfileService } from '../../../core/services/profile.service';
import { ReferenceDataService } from '../../../core/services/reference-data.service';
import { formErrorMessage, phoneNumber } from '../../../core/utils/form.validators';
import { downloadBlob } from '../../../core/utils/labels';
import { ChipListInputComponent } from '../../../shared/components/chip-list-input.component';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state.component';
import { FileSizePipe, LanguageLevelPipe } from '../../../shared/pipes/labels.pipes';
import { CertificationDialog } from './certification-dialog';
import { EducationDialog } from './education-dialog';
import { ExperienceDialog } from './experience-dialog';
import { LanguageDialog } from './language-dialog';
import {
  ResumeAnalysisDialog,
  ResumeAnalysisDialogData,
  ResumeAnalysisSelection,
} from './resume-analysis-dialog';
import {
  isCertificationComplete,
  isEducationComplete,
  isExperienceComplete,
  isLanguageComplete,
  isPersonalInfoValid,
  toCertificationRequest,
  toEducationRequest,
  toExperienceRequest,
  toLanguageRequest,
} from './resume-analysis.utils';

/**
 * Profil du candidat, organise en onglets.
 *
 * Onglets: informations personnelles, CV, etudes, experiences,
 * competences et langues, certifications.
 *
 * Apres le televersement d'un CV, le candidat peut le faire analyser par l'IA
 * (API Claude, appelee cote serveur). Les informations extraites sont proposees
 * dans une boite de revue: rien n'est enregistre sans validation.
 */
@Component({
  selector: 'app-profile-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    MatTabsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatAutocompleteModule,
    MatChipsModule,
    MatDividerModule,
    MatMenuModule,
    MatProgressBarModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    ChipListInputComponent,
    EmptyStateComponent,
    FileSizePipe,
    LanguageLevelPipe,
  ],
  templateUrl: './profile-page.html',
  styleUrl: './profile-page.scss',
})
export class ProfilePage {
  private readonly fb = inject(FormBuilder);
  private readonly profileService = inject(ProfileService);
  private readonly referenceData = inject(ReferenceDataService);
  private readonly dialog = inject(MatDialog);
  private readonly notifications = inject(NotificationService);

  readonly profile = this.profileService.profile;
  readonly reference = this.referenceData.data;

  readonly loading = signal(true);
  readonly savingInfo = signal(false);
  readonly savingSkills = signal(false);
  readonly uploading = signal(false);

  readonly selectedTab = signal(0);

  /** CV tout juste televerse, pour lequel on propose l'analyse automatique. */
  readonly pendingAnalysis = signal<Resume | null>(null);

  /** CV en cours d'analyse par l'IA (l'appel peut durer jusqu'a une minute). */
  readonly analyzingResumeId = signal<string | null>(null);
  readonly applyingAnalysis = signal(false);

  readonly skills = signal<string[]>([]);

  readonly infoForm = this.fb.nonNullable.group({
    firstName: ['', [Validators.required, Validators.maxLength(80)]],
    lastName: ['', [Validators.required, Validators.maxLength(80)]],
    phone: ['', [Validators.required, phoneNumber()]],
    addressLine: [''],
    city: ['', [Validators.required]],
    country: ['', [Validators.required]],
    postalCode: [''],
    headline: ['', [Validators.maxLength(120)]],
    summary: ['', [Validators.maxLength(1200)]],
  });

  constructor() {
    this.referenceData.load().subscribe();
    this.load();
  }

  infoError(control: string, label: string): string {
    return formErrorMessage(this.infoForm.get(control), label);
  }

  // -- Chargement ---------------------------------------------------------

  private load(onLoaded?: () => void): void {
    this.loading.set(true);
    this.profileService.load().subscribe({
      next: (profile) => {
        this.infoForm.patchValue({
          firstName: profile.firstName,
          lastName: profile.lastName,
          phone: profile.phone,
          addressLine: profile.addressLine,
          city: profile.city,
          country: profile.country,
          postalCode: profile.postalCode,
          headline: profile.headline,
          summary: profile.summary,
        });
        this.skills.set([...profile.skills]);
        this.loading.set(false);
        onLoaded?.();
      },
      error: () => this.loading.set(false),
    });
  }

  // -- Informations personnelles ------------------------------------------

  saveInfo(): void {
    if (this.infoForm.invalid) {
      this.infoForm.markAllAsTouched();
      return;
    }

    this.savingInfo.set(true);
    this.profileService.updatePersonalInfo(this.infoForm.getRawValue()).subscribe({
      next: () => {
        this.savingInfo.set(false);
        this.notifications.success('Informations personnelles enregistrees.');
      },
      error: () => this.savingInfo.set(false),
    });
  }

  // -- Competences ---------------------------------------------------------

  saveSkills(): void {
    this.savingSkills.set(true);
    this.profileService.updateSkills(this.skills()).subscribe({
      next: () => {
        this.savingSkills.set(false);
        this.notifications.success('Competences enregistrees.');
      },
      error: () => this.savingSkills.set(false),
    });
  }

  // -- CV ------------------------------------------------------------------

  onResumeSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';

    if (!file) {
      return;
    }

    this.uploading.set(true);
    this.profileService.uploadResume(file).subscribe({
      next: (resume) => {
        this.uploading.set(false);
        this.pendingAnalysis.set(resume);
        this.notifications.success('CV televerse.');
        this.load();
      },
      error: () => this.uploading.set(false),
    });
  }

  dismissPendingAnalysis(): void {
    this.pendingAnalysis.set(null);
  }

  // -- Analyse du CV par l'IA ----------------------------------------------

  /** Envoie le CV a l'analyse puis ouvre la revue des informations extraites. */
  analyzeResume(resume: Resume): void {
    this.pendingAnalysis.set(null);
    this.analyzingResumeId.set(resume.id);

    this.profileService.analyzeResume(resume.id).subscribe({
      next: (analysis) => {
        this.analyzingResumeId.set(null);
        this.openAnalysisReview(analysis);
      },
      error: () => this.analyzingResumeId.set(null),
    });
  }

  private openAnalysisReview(analysis: ResumeAnalysis): void {
    const profile = this.profile();
    if (!profile) {
      return;
    }

    this.dialog
      .open<ResumeAnalysisDialog, ResumeAnalysisDialogData, ResumeAnalysisSelection>(
        ResumeAnalysisDialog,
        { data: { analysis, profile }, maxWidth: '96vw', autoFocus: false },
      )
      .afterClosed()
      .subscribe((selection) => {
        if (selection) {
          this.applyAnalysis(selection, profile);
        }
      });
  }

  /**
   * Enregistre la selection du candidat:
   *  1. les elements complets sont enregistres directement (en parallele) ;
   *  2. les elements incomplets s'ouvrent un par un dans leur formulaire pre-rempli ;
   *  3. si les informations personnelles fusionnees ne sont pas valides (champ obligatoire
   *     absent du CV comme du profil), elles sont seulement recopiees dans le formulaire.
   */
  private applyAnalysis(selection: ResumeAnalysisSelection, profile: EmployeeProfile): void {
    const direct: Observable<number>[] = [];
    const guided: (() => Observable<number>)[] = [];
    let infoToComplete: UpdatePersonalInfoRequest | null = null;

    if (Object.keys(selection.personal).length) {
      const merged: UpdatePersonalInfoRequest = {
        firstName: profile.firstName,
        lastName: profile.lastName,
        phone: profile.phone,
        addressLine: profile.addressLine,
        city: profile.city,
        country: profile.country,
        postalCode: profile.postalCode,
        headline: profile.headline,
        summary: profile.summary,
        ...selection.personal,
      };

      if (isPersonalInfoValid(merged)) {
        direct.push(this.succeeded(this.profileService.updatePersonalInfo(merged)));
      } else {
        infoToComplete = merged;
      }
    }

    if (selection.skills.length) {
      direct.push(
        this.succeeded(
          this.profileService.updateSkills([...profile.skills, ...selection.skills]),
          selection.skills.length,
        ),
      );
    }

    for (const draft of selection.educations) {
      if (isEducationComplete(draft)) {
        direct.push(this.succeeded(this.profileService.addEducation(toEducationRequest(draft))));
      } else {
        guided.push(() =>
          this.dialog
            .open(EducationDialog, { data: { education: null, draft }, maxWidth: '96vw' })
            .afterClosed()
            .pipe(switchMap((request) => this.saveIf(request, (r) => this.profileService.addEducation(r)))),
        );
      }
    }

    for (const draft of selection.experiences) {
      if (isExperienceComplete(draft)) {
        direct.push(this.succeeded(this.profileService.addExperience(toExperienceRequest(draft))));
      } else {
        guided.push(() =>
          this.dialog
            .open(ExperienceDialog, { data: { experience: null, draft }, maxWidth: '96vw' })
            .afterClosed()
            .pipe(switchMap((request) => this.saveIf(request, (r) => this.profileService.addExperience(r)))),
        );
      }
    }

    for (const draft of selection.languages) {
      if (isLanguageComplete(draft)) {
        direct.push(this.succeeded(this.profileService.addLanguage(toLanguageRequest(draft))));
      } else {
        guided.push(() =>
          this.dialog
            .open(LanguageDialog, { data: { language: null, draft } })
            .afterClosed()
            .pipe(switchMap((request) => this.saveIf(request, (r) => this.profileService.addLanguage(r)))),
        );
      }
    }

    for (const draft of selection.certifications) {
      if (isCertificationComplete(draft)) {
        direct.push(
          this.succeeded(this.profileService.addCertification(toCertificationRequest(draft))),
        );
      } else {
        guided.push(() =>
          this.dialog
            .open(CertificationDialog, { data: { certification: null, draft }, maxWidth: '96vw' })
            .afterClosed()
            .pipe(
              switchMap((request) => this.saveIf(request, (r) => this.profileService.addCertification(r))),
            ),
        );
      }
    }

    const direct$ = direct.length ? forkJoin(direct) : of<number[]>([]);
    // defer: chaque formulaire ne s'ouvre qu'une fois le precedent ferme.
    const guided$ = guided.length
      ? concat(...guided.map((open) => defer(open))).pipe(toArray())
      : of<number[]>([]);

    this.applyingAnalysis.set(true);

    direct$
      .pipe(switchMap((first) => guided$.pipe(map((second) => [...first, ...second]))))
      .subscribe((results) => {
        this.applyingAnalysis.set(false);
        const added = results.reduce((total, count) => total + count, 0);

        this.load(() => {
          if (infoToComplete) {
            this.infoForm.patchValue(infoToComplete);
            this.infoForm.markAllAsTouched();
            this.selectedTab.set(0);
            this.notifications.info(
              `${added} element(s) ajoute(s). Completez les informations personnelles obligatoires puis enregistrez.`,
            );
          } else if (added) {
            this.notifications.success(`${added} element(s) ajoute(s) a votre profil a partir du CV.`);
          }
        });
      });
  }

  /** Enregistre la valeur d'un formulaire guide, ou ne fait rien s'il a ete annule. */
  private saveIf<T>(request: T | undefined, save: (value: T) => Observable<unknown>): Observable<number> {
    return request ? this.succeeded(save(request)) : of(0);
  }

  /** Nombre d'elements enregistres par un appel (0 en cas d'echec), sans interrompre les autres. */
  private succeeded(call: Observable<unknown>, itemCount = 1): Observable<number> {
    return call.pipe(
      map(() => itemCount),
      catchError(() => of(0)),
    );
  }

  setDefaultResume(resume: Resume): void {
    this.profileService.setDefaultResume(resume.id).subscribe({
      next: () => {
        this.notifications.success(`"${resume.fileName}" est maintenant votre CV par defaut.`);
        this.load();
      },
    });
  }

  downloadResume(resume: Resume): void {
    this.profileService.downloadResume(resume.id).subscribe({
      next: (blob) => downloadBlob(blob, resume.fileName),
    });
  }

  deleteResume(resume: Resume): void {
    this.confirm('Supprimer le CV', `Supprimer definitivement "${resume.fileName}" ?`, () =>
      this.profileService.deleteResume(resume.id).subscribe({
        next: () => {
          this.notifications.success('CV supprime.');
          this.load();
        },
      }),
    );
  }

  // -- Etudes --------------------------------------------------------------

  openEducation(education: Education | null): void {
    this.dialog
      .open(EducationDialog, { data: { education }, maxWidth: '96vw' })
      .afterClosed()
      .subscribe((request) => {
        if (!request) {
          return;
        }

        const call = education
          ? this.profileService.updateEducation(education.id, request)
          : this.profileService.addEducation(request);

        call.subscribe({
          next: () => {
            this.notifications.success('Formation enregistree.');
            this.load();
          },
        });
      });
  }

  deleteEducation(education: Education): void {
    this.confirm('Supprimer la formation', `Supprimer "${education.diplomaName}" ?`, () =>
      this.profileService.deleteEducation(education.id).subscribe({
        next: () => {
          this.notifications.success('Formation supprimee.');
          this.load();
        },
      }),
    );
  }

  // -- Experiences ---------------------------------------------------------

  openExperience(experience: Experience | null): void {
    this.dialog
      .open(ExperienceDialog, { data: { experience }, maxWidth: '96vw' })
      .afterClosed()
      .subscribe((request) => {
        if (!request) {
          return;
        }

        const call = experience
          ? this.profileService.updateExperience(experience.id, request)
          : this.profileService.addExperience(request);

        call.subscribe({
          next: () => {
            this.notifications.success('Experience enregistree.');
            this.load();
          },
        });
      });
  }

  deleteExperience(experience: Experience): void {
    this.confirm('Supprimer l’experience', `Supprimer "${experience.jobTitle}" ?`, () =>
      this.profileService.deleteExperience(experience.id).subscribe({
        next: () => {
          this.notifications.success('Experience supprimee.');
          this.load();
        },
      }),
    );
  }

  // -- Langues -------------------------------------------------------------

  openLanguage(language: LanguageSkill | null): void {
    this.dialog
      .open(LanguageDialog, { data: { language } })
      .afterClosed()
      .subscribe((request) => {
        if (!request) {
          return;
        }

        const call = language
          ? this.profileService.updateLanguage(language.id, request)
          : this.profileService.addLanguage(request);

        call.subscribe({
          next: () => {
            this.notifications.success('Langue enregistree.');
            this.load();
          },
        });
      });
  }

  deleteLanguage(language: LanguageSkill): void {
    this.confirm('Supprimer la langue', `Retirer "${language.name}" de votre profil ?`, () =>
      this.profileService.deleteLanguage(language.id).subscribe({
        next: () => {
          this.notifications.success('Langue supprimee.');
          this.load();
        },
      }),
    );
  }

  // -- Certifications ------------------------------------------------------

  openCertification(certification: Certification | null): void {
    this.dialog
      .open(CertificationDialog, { data: { certification }, maxWidth: '96vw' })
      .afterClosed()
      .subscribe((request) => {
        if (!request) {
          return;
        }

        const call = certification
          ? this.profileService.updateCertification(certification.id, request)
          : this.profileService.addCertification(request);

        call.subscribe({
          next: () => {
            this.notifications.success('Certification enregistree.');
            this.load();
          },
        });
      });
  }

  deleteCertification(certification: Certification): void {
    this.confirm('Supprimer la certification', `Supprimer "${certification.name}" ?`, () =>
      this.profileService.deleteCertification(certification.id).subscribe({
        next: () => {
          this.notifications.success('Certification supprimee.');
          this.load();
        },
      }),
    );
  }

  // -- Helpers -------------------------------------------------------------

  private confirm(title: string, message: string, action: () => void): void {
    this.dialog
      .open(ConfirmDialogComponent, {
        data: { title, message, confirmLabel: 'Supprimer', danger: true },
      })
      .afterClosed()
      .subscribe((confirmed) => {
        if (confirmed) {
          action();
        }
      });
  }
}
