import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatRadioModule } from '@angular/material/radio';
import { MatTabsModule } from '@angular/material/tabs';

import { JobDetails, MyApplication, Resume } from '../../core/models/api.models';
import { JobsService } from '../../core/services/jobs.service';
import { NotificationService } from '../../core/services/notification.service';
import { ProfileService } from '../../core/services/profile.service';
import { FileSizePipe } from '../../shared/pipes/labels.pipes';

export interface ApplyDialogData {
  job: JobDetails;
}

const ALLOWED_LETTER_EXTENSIONS = ['.pdf', '.doc', '.docx', '.txt'];

/**
 * Depot d'une candidature.
 *
 * Le candidat choisit un CV existant ou en televerse un nouveau,
 * puis saisit une lettre de presentation (texte libre ou fichier).
 */
@Component({
  selector: 'app-apply-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatRadioModule,
    MatFormFieldModule,
    MatInputModule,
    MatTabsModule,
    FileSizePipe,
  ],
  templateUrl: './apply-dialog.component.html',
  styleUrl: './apply-dialog.component.scss',
})
export class ApplyDialogComponent {
  private readonly fb = inject(FormBuilder);
  private readonly profileService = inject(ProfileService);
  private readonly jobsService = inject(JobsService);
  private readonly notifications = inject(NotificationService);
  private readonly dialogRef = inject(MatDialogRef<ApplyDialogComponent, MyApplication>);

  readonly data = inject<ApplyDialogData>(MAT_DIALOG_DATA);

  readonly resumes = signal<Resume[]>([]);
  readonly loading = signal(true);
  readonly uploading = signal(false);
  readonly submitting = signal(false);
  readonly letterFileName = signal('');
  readonly fileError = signal('');

  readonly form = this.fb.nonNullable.group({
    resumeId: ['', [Validators.required]],
    coverLetter: ['', [Validators.maxLength(5000)]],
  });

  constructor() {
    this.loadResumes();
  }

  /** Charge les CV du candidat et selectionne celui marque par defaut. */
  private loadResumes(): void {
    this.loading.set(true);
    this.profileService.getResumes().subscribe({
      next: (resumes) => {
        this.resumes.set(resumes);
        const preferred = resumes.find((r) => r.isDefault) ?? resumes[0];
        if (preferred) {
          this.form.patchValue({ resumeId: preferred.id });
        }
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  /** Televerse un nouveau CV depuis la boite de dialogue et le selectionne. */
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
        this.resumes.update((items) => [resume, ...items]);
        this.form.patchValue({ resumeId: resume.id });
        this.notifications.success('CV ajoute a votre profil.');
      },
      error: () => this.uploading.set(false),
    });
  }

  /** Lit une lettre de presentation deposee sous forme de fichier texte. */
  onLetterSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    this.fileError.set('');

    if (!file) {
      return;
    }

    const extension = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();
    if (!ALLOWED_LETTER_EXTENSIONS.includes(extension)) {
      this.fileError.set('Formats acceptes: PDF, DOC, DOCX, TXT.');
      return;
    }

    this.letterFileName.set(file.name);

    // Seuls les fichiers texte peuvent etre lus directement dans le navigateur;
    // pour les autres formats, seul le nom du fichier est transmis.
    if (extension === '.txt') {
      file.text().then((content) => this.form.patchValue({ coverLetter: content.slice(0, 5000) }));
    }
  }

  clearLetterFile(): void {
    this.letterFileName.set('');
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    const value = this.form.getRawValue();

    this.jobsService
      .apply(this.data.job.id, {
        resumeId: value.resumeId,
        coverLetter: value.coverLetter || null,
        coverLetterFileName: this.letterFileName() || null,
      })
      .subscribe({
        next: (application) => {
          this.submitting.set(false);
          this.notifications.success('Candidature envoyee. Bonne chance !');
          this.dialogRef.close(application);
        },
        error: () => this.submitting.set(false),
      });
  }

  close(): void {
    this.dialogRef.close();
  }
}
