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

import { Education, EducationRequest } from '../../../core/models/api.models';
import { ReferenceDataService } from '../../../core/services/reference-data.service';
import { dateRange, formErrorMessage } from '../../../core/utils/form.validators';
import { fromDateOnly, toDateOnly } from '../../../core/utils/labels';

export interface EducationDialogData {
  education: Education | null;
}

/** Ajout ou modification d'une formation. */
@Component({
  selector: 'app-education-dialog',
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
  ],
  templateUrl: './education-dialog.html',
  styleUrl: './profile-dialogs.scss',
})
export class EducationDialog {
  private readonly fb = inject(FormBuilder);
  private readonly dialogRef = inject(MatDialogRef<EducationDialog, EducationRequest>);
  private readonly referenceData = inject(ReferenceDataService);

  readonly data = inject<EducationDialogData>(MAT_DIALOG_DATA);
  readonly reference = this.referenceData.data;
  readonly isEdit = signal(Boolean(this.data.education));

  readonly form = this.fb.nonNullable.group(
    {
      schoolName: ['', [Validators.required]],
      city: ['', [Validators.required]],
      country: ['Canada', [Validators.required]],
      diplomaName: ['', [Validators.required]],
      fieldOfStudy: ['', [Validators.required]],
      startDate: [null as Date | null, [Validators.required]],
      endDate: [null as Date | null],
      isCurrent: [false],
      diplomaObtained: [false],
      expectedGraduationDate: [null as Date | null],
      accumulatedCredits: [null as number | null, [Validators.min(0), Validators.max(300)]],
      gpa: [null as number | null, [Validators.min(0), Validators.max(100)]],
    },
    { validators: dateRange('startDate', 'endDate', 'isCurrent') },
  );

  constructor() {
    const education = this.data.education;
    if (education) {
      this.form.patchValue({
        schoolName: education.schoolName,
        city: education.city,
        country: education.country,
        diplomaName: education.diplomaName,
        fieldOfStudy: education.fieldOfStudy,
        isCurrent: education.isCurrent,
        diplomaObtained: education.diplomaObtained,
        accumulatedCredits: education.accumulatedCredits,
        gpa: education.gpa,
        startDate: fromDateOnly(education.startDate),
        endDate: fromDateOnly(education.endDate),
        expectedGraduationDate: fromDateOnly(education.expectedGraduationDate),
      });
    }

    // "Etudes en cours" et "diplome obtenu" pilotent l'obligation des dates associees.
    this.form.controls.isCurrent.valueChanges.subscribe(() => this.syncConditionalValidators());
    this.form.controls.diplomaObtained.valueChanges.subscribe(() => this.syncConditionalValidators());
    this.syncConditionalValidators();
  }

  errorFor(control: string, label: string): string {
    return formErrorMessage(this.form.get(control), label);
  }

  private syncConditionalValidators(): void {
    const { isCurrent, diplomaObtained } = this.form.getRawValue();
    const endDate = this.form.controls.endDate;
    const expected = this.form.controls.expectedGraduationDate;

    if (isCurrent) {
      endDate.clearValidators();
      endDate.setValue(null, { emitEvent: false });
    } else {
      endDate.setValidators([Validators.required]);
    }

    if (diplomaObtained) {
      expected.clearValidators();
      expected.setValue(null, { emitEvent: false });
    } else {
      expected.setValidators([Validators.required]);
    }

    endDate.updateValueAndValidity({ emitEvent: false });
    expected.updateValueAndValidity({ emitEvent: false });
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();

    this.dialogRef.close({
      schoolName: value.schoolName,
      city: value.city,
      country: value.country,
      diplomaName: value.diplomaName,
      fieldOfStudy: value.fieldOfStudy,
      startDate: toDateOnly(value.startDate)!,
      endDate: toDateOnly(value.endDate),
      isCurrent: value.isCurrent,
      diplomaObtained: value.diplomaObtained,
      expectedGraduationDate: toDateOnly(value.expectedGraduationDate),
      accumulatedCredits: value.accumulatedCredits,
      gpa: value.gpa,
    });
  }

  cancel(): void {
    this.dialogRef.close();
  }
}
