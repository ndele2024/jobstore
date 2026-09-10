import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

import { Certification, CertificationRequest } from '../../../core/models/api.models';
import { formErrorMessage } from '../../../core/utils/form.validators';
import { fromDateOnly, toDateOnly } from '../../../core/utils/labels';

export interface CertificationDialogData {
  certification: Certification | null;
}

/** Ajout ou modification d'une certification professionnelle. */
@Component({
  selector: 'app-certification-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatDatepickerModule,
  ],
  templateUrl: './certification-dialog.html',
  styleUrl: './profile-dialogs.scss',
})
export class CertificationDialog {
  private readonly fb = inject(FormBuilder);
  private readonly dialogRef = inject(MatDialogRef<CertificationDialog, CertificationRequest>);

  readonly data = inject<CertificationDialogData>(MAT_DIALOG_DATA);
  readonly isEdit = signal(Boolean(this.data.certification));

  readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required]],
    issuer: ['', [Validators.required]],
    issueDate: [null as Date | null],
    expirationDate: [null as Date | null],
    credentialId: [''],
  });

  constructor() {
    const certification = this.data.certification;
    if (certification) {
      this.form.patchValue({
        name: certification.name,
        issuer: certification.issuer,
        credentialId: certification.credentialId,
        issueDate: fromDateOnly(certification.issueDate),
        expirationDate: fromDateOnly(certification.expirationDate),
      });
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

    const value = this.form.getRawValue();

    this.dialogRef.close({
      name: value.name,
      issuer: value.issuer,
      issueDate: toDateOnly(value.issueDate),
      expirationDate: toDateOnly(value.expirationDate),
      credentialId: value.credentialId,
    });
  }

  cancel(): void {
    this.dialogRef.close();
  }
}
