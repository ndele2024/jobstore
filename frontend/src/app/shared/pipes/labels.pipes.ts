import { Pipe, PipeTransform } from '@angular/core';

import {
  ApplicationStatus,
  ContractType,
  JobStatus,
  LanguageLevel,
  UserRole,
  WorkMode,
} from '../../core/models/api.models';
import {
  APPLICATION_STATUS_LABELS,
  CONTRACT_TYPE_LABELS,
  JOB_STATUS_LABELS,
  LANGUAGE_LEVEL_LABELS,
  USER_ROLE_LABELS,
  WORK_MODE_LABELS,
} from '../../core/utils/labels';

@Pipe({ name: 'applicationStatus' })
export class ApplicationStatusPipe implements PipeTransform {
  transform(value: ApplicationStatus): string {
    return APPLICATION_STATUS_LABELS[value] ?? '-';
  }
}

@Pipe({ name: 'jobStatus' })
export class JobStatusPipe implements PipeTransform {
  transform(value: JobStatus): string {
    return JOB_STATUS_LABELS[value] ?? '-';
  }
}

@Pipe({ name: 'contractType' })
export class ContractTypePipe implements PipeTransform {
  transform(value: ContractType): string {
    return CONTRACT_TYPE_LABELS[value] ?? '-';
  }
}

@Pipe({ name: 'workMode' })
export class WorkModePipe implements PipeTransform {
  transform(value: WorkMode): string {
    return WORK_MODE_LABELS[value] ?? '-';
  }
}

@Pipe({ name: 'languageLevel' })
export class LanguageLevelPipe implements PipeTransform {
  transform(value: LanguageLevel): string {
    return LANGUAGE_LEVEL_LABELS[value] ?? '-';
  }
}

@Pipe({ name: 'userRole' })
export class UserRolePipe implements PipeTransform {
  transform(value: UserRole): string {
    return USER_ROLE_LABELS[value] ?? '-';
  }
}

/**
 * Fourchette de salaire lisible: "80 000 $ - 105 000 $".
 * Une borne a zero est consideree comme non renseignee.
 */
@Pipe({ name: 'salaryRange' })
export class SalaryRangePipe implements PipeTransform {
  private readonly formatter = new Intl.NumberFormat('fr-CA', {
    style: 'currency',
    currency: 'CAD',
    maximumFractionDigits: 0,
  });

  transform(min: number, max: number): string {
    if (!min && !max) {
      return 'Salaire a discuter';
    }
    if (!max || min === max) {
      return `A partir de ${this.formatter.format(min)}`;
    }
    if (!min) {
      return `Jusqu'a ${this.formatter.format(max)}`;
    }
    return `${this.formatter.format(min)} - ${this.formatter.format(max)}`;
  }
}

/** Taille de fichier lisible. */
@Pipe({ name: 'fileSize' })
export class FileSizePipe implements PipeTransform {
  transform(bytes: number): string {
    if (bytes < 1024) return `${bytes} o`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} Ko`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
  }
}

/** Date relative simple: "aujourd'hui", "il y a 3 jours", sinon la date complete. */
@Pipe({ name: 'timeAgo' })
export class TimeAgoPipe implements PipeTransform {
  transform(value: string | Date): string {
    const date = value instanceof Date ? value : new Date(value);
    const days = Math.floor((Date.now() - date.getTime()) / 86_400_000);

    if (days <= 0) return "aujourd'hui";
    if (days === 1) return 'hier';
    if (days < 30) return `il y a ${days} jours`;

    return date.toLocaleDateString('fr-CA', { day: 'numeric', month: 'long', year: 'numeric' });
  }
}
