import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
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
  LanguageSkill,
  Resume,
  ResumeParsingResult,
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

/**
 * Profil du candidat, organise en onglets.
 *
 * Onglets: informations personnelles, CV, etudes, experiences,
 * competences et langues, certifications.
 *
 * Le televersement d'un CV declenche une lecture automatique cote API:
 * les valeurs detectees sont proposees en pre-remplissage, jamais imposees.
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

  /** Resultat de la derniere lecture automatique de CV, propose a l'utilisateur. */
  readonly parsed = signal<ResumeParsingResult | null>(null);

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

  private load(): void {
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
      next: (response) => {
        this.uploading.set(false);
        this.parsed.set(response.parsed);
        this.notifications.success('CV televerse.');
        this.load();
      },
      error: () => this.uploading.set(false),
    });
  }

  /** Recopie les valeurs detectees dans le formulaire, sans ecraser ce qui est deja rempli. */
  applyParsedData(): void {
    const parsed = this.parsed();
    if (!parsed) {
      return;
    }

    const current = this.infoForm.getRawValue();
    this.infoForm.patchValue({
      firstName: current.firstName || parsed.firstName || '',
      lastName: current.lastName || parsed.lastName || '',
      phone: current.phone || parsed.phone || '',
      city: current.city || parsed.city || '',
      country: current.country || parsed.country || '',
    });

    if (parsed.skills.length) {
      const merged = new Set([...this.skills(), ...parsed.skills]);
      this.skills.set([...merged]);
    }

    this.notifications.info(
      'Champs pre-remplis a partir du CV. Verifiez les valeurs puis enregistrez.',
    );
  }

  dismissParsedData(): void {
    this.parsed.set(null);
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
