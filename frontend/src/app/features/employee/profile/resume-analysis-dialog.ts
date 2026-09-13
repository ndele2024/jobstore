import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, WritableSignal, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';

import {
  EmployeeProfile,
  ExtractedCertification,
  ExtractedEducation,
  ExtractedExperience,
  ExtractedLanguage,
  ResumeAnalysis,
  UpdatePersonalInfoRequest,
} from '../../../core/models/api.models';
import { LanguageLevelPipe } from '../../../shared/pipes/labels.pipes';
import {
  PERSONAL_FIELDS,
  PersonalField,
  isCertificationComplete,
  isDuplicateCertification,
  isDuplicateEducation,
  isDuplicateExperience,
  isDuplicateLanguage,
  isEducationComplete,
  isExperienceComplete,
  isLanguageComplete,
  normalize,
} from './resume-analysis.utils';

export interface ResumeAnalysisDialogData {
  analysis: ResumeAnalysis;
  profile: EmployeeProfile;
}

/** Elements retenus par le candidat, renvoyes a la page profil pour enregistrement. */
export interface ResumeAnalysisSelection {
  personal: Partial<UpdatePersonalInfoRequest>;
  skills: string[];
  educations: ExtractedEducation[];
  experiences: ExtractedExperience[];
  languages: ExtractedLanguage[];
  certifications: ExtractedCertification[];
}

interface PersonalRow {
  key: PersonalField;
  label: string;
  current: string;
  extracted: string;
  selected: WritableSignal<boolean>;
}

interface ReviewItem<T> {
  value: T;
  complete: boolean;
  duplicate: boolean;
  selected: WritableSignal<boolean>;
}

/**
 * Revue des informations extraites du CV par l'IA.
 *
 * Le candidat coche ce qu'il veut reprendre. Par defaut:
 *  - un champ personnel est coche seulement s'il est vide dans le profil (on n'ecrase rien sans accord) ;
 *  - un element deja present dans le profil est decoche ;
 *  - un element incomplet reste cochable: il sera ouvert dans son formulaire pour etre termine.
 */
@Component({
  selector: 'app-resume-analysis-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    NgTemplateOutlet,
    MatDialogModule,
    MatButtonModule,
    MatCheckboxModule,
    MatIconModule,
    LanguageLevelPipe,
  ],
  templateUrl: './resume-analysis-dialog.html',
  styleUrl: './resume-analysis-dialog.scss',
})
export class ResumeAnalysisDialog {
  private readonly dialogRef = inject(MatDialogRef<ResumeAnalysisDialog, ResumeAnalysisSelection>);
  readonly data = inject<ResumeAnalysisDialogData>(MAT_DIALOG_DATA);

  readonly personalRows: PersonalRow[] = this.buildPersonalRows();

  readonly skills = this.data.analysis.skills
    .filter((skill) => !this.data.profile.skills.some((existing) => normalize(existing) === normalize(skill)))
    .map((skill) => ({ value: skill, selected: signal(true) }));

  readonly educations = this.buildItems(this.data.analysis.educations, isEducationComplete, isDuplicateEducation);
  readonly experiences = this.buildItems(this.data.analysis.experiences, isExperienceComplete, isDuplicateExperience);
  readonly languages = this.buildItems(this.data.analysis.languages, isLanguageComplete, isDuplicateLanguage);
  readonly certifications = this.buildItems(
    this.data.analysis.certifications,
    isCertificationComplete,
    isDuplicateCertification,
  );

  readonly hasProposals =
    this.personalRows.length +
      this.skills.length +
      this.educations.length +
      this.experiences.length +
      this.languages.length +
      this.certifications.length >
    0;

  readonly selectedCount = computed(
    () =>
      [
        ...this.personalRows,
        ...this.skills,
        ...this.educations,
        ...this.experiences,
        ...this.languages,
        ...this.certifications,
      ].filter((row) => row.selected()).length,
  );

  readonly incompleteSelectedCount = computed(
    () =>
      [...this.educations, ...this.experiences, ...this.languages, ...this.certifications].filter(
        (item) => item.selected() && !item.complete,
      ).length,
  );

  setAllSkills(selected: boolean): void {
    this.skills.forEach((skill) => skill.selected.set(selected));
  }

  apply(): void {
    const personal: Partial<UpdatePersonalInfoRequest> = {};
    this.personalRows
      .filter((row) => row.selected())
      .forEach((row) => (personal[row.key] = row.extracted));

    this.dialogRef.close({
      personal,
      skills: this.skills.filter((s) => s.selected()).map((s) => s.value),
      educations: this.pick(this.educations),
      experiences: this.pick(this.experiences),
      languages: this.pick(this.languages),
      certifications: this.pick(this.certifications),
    });
  }

  cancel(): void {
    this.dialogRef.close();
  }

  private pick<T>(items: ReviewItem<T>[]): T[] {
    return items.filter((item) => item.selected()).map((item) => item.value);
  }

  private buildPersonalRows(): PersonalRow[] {
    const { personalInfo } = this.data.analysis;
    const profile = this.data.profile;

    return PERSONAL_FIELDS.flatMap(({ key, label }) => {
      const extracted = personalInfo[key];
      const current = profile[key] ?? '';

      // Rien a proposer si le CV ne contient pas l'information ou si elle est deja identique.
      if (!extracted || normalize(extracted) === normalize(current)) {
        return [];
      }

      return [{ key, label, current, extracted, selected: signal(current.trim().length === 0) }];
    });
  }

  private buildItems<T>(
    values: T[],
    isComplete: (value: T) => boolean,
    isDuplicate: (value: T, profile: EmployeeProfile) => boolean,
  ): ReviewItem<T>[] {
    return values.map((value) => {
      const duplicate = isDuplicate(value, this.data.profile);
      return { value, complete: isComplete(value), duplicate, selected: signal(!duplicate) };
    });
  }
}
