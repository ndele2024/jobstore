import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';

import { LanguageLevel, LanguageRequest, LanguageSkill } from '../../../core/models/api.models';
import { ReferenceDataService } from '../../../core/services/reference-data.service';
import { formErrorMessage } from '../../../core/utils/form.validators';

export interface LanguageDialogData {
  language: LanguageSkill | null;
}

/** Ajout ou modification d'une langue et de son niveau. */
@Component({
  selector: 'app-language-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatAutocompleteModule,
  ],
  templateUrl: './language-dialog.html',
  styleUrl: './profile-dialogs.scss',
})
export class LanguageDialog {
  private readonly fb = inject(FormBuilder);
  private readonly dialogRef = inject(MatDialogRef<LanguageDialog, LanguageRequest>);
  private readonly referenceData = inject(ReferenceDataService);

  readonly data = inject<LanguageDialogData>(MAT_DIALOG_DATA);
  readonly reference = this.referenceData.data;
  readonly isEdit = signal(Boolean(this.data.language));

  readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required]],
    level: [LanguageLevel.Intermediate as LanguageLevel, [Validators.required]],
  });

  constructor() {
    const language = this.data.language;
    if (language) {
      this.form.patchValue({ name: language.name, level: language.level });
    }
  }

  errorFor(control: string, label: string): string {
    return formErrorMessage(this.form.get(control), label);
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.dialogRef.close(this.form.getRawValue());
  }

  cancel(): void {
    this.dialogRef.close();
  }
}
