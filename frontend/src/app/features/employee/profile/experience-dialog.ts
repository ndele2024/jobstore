import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';

import { Experience, ExperienceRequest, ExtractedExperience } from '../../../core/models/api.models';
import { ReferenceDataService } from '../../../core/services/reference-data.service';
import { dateRange, formErrorMessage } from '../../../core/utils/form.validators';
import { fromDateOnly, toDateOnly } from '../../../core/utils/labels';
import { ChipListInputComponent } from '../../../shared/components/chip-list-input.component';

export interface ExperienceDialogData {
  experience: Experience | null;
  /** Valeurs de depart en creation (par exemple issues de l'analyse d'un CV). */
  draft?: ExtractedExperience;
}

/** Ajout ou modification d'une experience professionnelle, avec sa liste de taches. */
@Component({
  selector: 'app-experience-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatDatepickerModule,
    MatCheckboxModule,
    MatAutocompleteModule,
    MatIconModule,
    ChipListInputComponent,
  ],
  templateUrl: './experience-dialog.html',
  styleUrl: './profile-dialogs.scss',
})
export class ExperienceDialog {
  private readonly fb = inject(FormBuilder);
  private readonly dialogRef = inject(MatDialogRef<ExperienceDialog, ExperienceRequest>);
  private readonly referenceData = inject(ReferenceDataService);

  readonly data = inject<ExperienceDialogData>(MAT_DIALOG_DATA);
  readonly reference = this.referenceData.data;
  readonly isEdit = signal(Boolean(this.data.experience));

  /** Les taches sont gerees hors du FormGroup, via le composant de puces. */
  readonly tasks = signal<string[]>([...(this.data.experience?.tasks ?? this.data.draft?.tasks ?? [])]);

  readonly form = this.fb.nonNullable.group(
    {
      jobTitle: ['', [Validators.required]],
      companyName: ['', [Validators.required]],
      city: ['', [Validators.required]],
      country: ['Canada', [Validators.required]],
      startDate: [null as Date | null, [Validators.required]],
      endDate: [null as Date | null],
      isCurrent: [false],
    },
    { validators: dateRange('startDate', 'endDate', 'isCurrent') },
  );

  constructor() {
    const experience = this.data.experience ?? this.data.draft;
    if (experience) {
      this.form.patchValue({
        jobTitle: experience.jobTitle ?? '',
        companyName: experience.companyName ?? '',
        city: experience.city ?? '',
        country: experience.country ?? '',
        isCurrent: experience.isCurrent,
        startDate: fromDateOnly(experience.startDate),
        endDate: fromDateOnly(experience.endDate),
      });
    }

    this.form.controls.isCurrent.valueChanges.subscribe(() => this.syncEndDate());
    this.syncEndDate();
  }

  errorFor(control: string, label: string): string {
    return formErrorMessage(this.form.get(control), label);
  }

  private syncEndDate(): void {
    const endDate = this.form.controls.endDate;

    if (this.form.controls.isCurrent.value) {
      endDate.clearValidators();
      endDate.setValue(null, { emitEvent: false });
    } else {
      endDate.setValidators([Validators.required]);
    }

    endDate.updateValueAndValidity({ emitEvent: false });
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();

    this.dialogRef.close({
      jobTitle: value.jobTitle,
      companyName: value.companyName,
      city: value.city,
      country: value.country,
      startDate: toDateOnly(value.startDate)!,
      endDate: toDateOnly(value.endDate),
      isCurrent: value.isCurrent,
      tasks: this.tasks(),
    });
  }

  cancel(): void {
    this.dialogRef.close();
  }
}
