import {
  ApplicationStatus,
  ContractType,
  JobStatus,
  LanguageLevel,
  UserRole,
  WorkMode,
} from '../models/api.models';

/**
 * Libelles francais des enums et couleurs associees.
 * Le backend renvoie aussi ces libelles via /api/reference-data;
 * cette table locale evite d'attendre la reponse reseau pour un simple affichage.
 */

export const APPLICATION_STATUS_LABELS: Record<ApplicationStatus, string> = {
  [ApplicationStatus.Submitted]: 'Soumise',
  [ApplicationStatus.InReview]: 'En analyse',
  [ApplicationStatus.Shortlisted]: 'Preselectionnee',
  [ApplicationStatus.Rejected]: 'Refusee',
  [ApplicationStatus.Accepted]: 'Acceptee',
};

/** Classe CSS de la puce de statut (voir styles.scss, section "chips"). */
export const APPLICATION_STATUS_TONES: Record<ApplicationStatus, string> = {
  [ApplicationStatus.Submitted]: 'tone-info',
  [ApplicationStatus.InReview]: 'tone-warn',
  [ApplicationStatus.Shortlisted]: 'tone-accent',
  [ApplicationStatus.Rejected]: 'tone-danger',
  [ApplicationStatus.Accepted]: 'tone-success',
};

export const JOB_STATUS_LABELS: Record<JobStatus, string> = {
  [JobStatus.Draft]: 'Brouillon',
  [JobStatus.Published]: 'Publiee',
  [JobStatus.Closed]: 'Fermee',
  [JobStatus.Deleted]: 'Supprimee',
  [JobStatus.External]: 'Externe',
};

export const JOB_STATUS_TONES: Record<JobStatus, string> = {
  [JobStatus.Draft]: 'tone-neutral',
  [JobStatus.Published]: 'tone-success',
  [JobStatus.Closed]: 'tone-danger',
  [JobStatus.Deleted]: 'tone-neutral',
  [JobStatus.External]: 'tone-info',
};

export const CONTRACT_TYPE_LABELS: Record<ContractType, string> = {
  [ContractType.FullTime]: 'Temps plein',
  [ContractType.PartTime]: 'Temps partiel',
  [ContractType.Contract]: 'Contrat',
  [ContractType.Internship]: 'Stage',
  [ContractType.Freelance]: 'Pigiste',
};

export const WORK_MODE_LABELS: Record<WorkMode, string> = {
  [WorkMode.OnSite]: 'Sur place',
  [WorkMode.Hybrid]: 'Hybride',
  [WorkMode.Remote]: 'Teletravail',
};

export const WORK_MODE_ICONS: Record<WorkMode, string> = {
  [WorkMode.OnSite]: 'apartment',
  [WorkMode.Hybrid]: 'sync_alt',
  [WorkMode.Remote]: 'home_work',
};

export const LANGUAGE_LEVEL_LABELS: Record<LanguageLevel, string> = {
  [LanguageLevel.Beginner]: 'Debutant',
  [LanguageLevel.Intermediate]: 'Intermediaire',
  [LanguageLevel.Advanced]: 'Avance',
  [LanguageLevel.Fluent]: 'Courant',
  [LanguageLevel.Native]: 'Langue maternelle',
};

export const USER_ROLE_LABELS: Record<UserRole, string> = {
  [UserRole.Employee]: 'Candidat',
  [UserRole.Employer]: 'Entreprise',
  [UserRole.Admin]: 'Administrateur',
};

/** Couleur de la jauge de correspondance selon le score. */
export function matchTone(percentage: number | null | undefined): string {
  if (percentage === null || percentage === undefined) return 'tone-neutral';
  if (percentage >= 75) return 'tone-success';
  if (percentage >= 45) return 'tone-warn';
  return 'tone-danger';
}

/** Nombre de jours restants avant la fin d'affichage d'une offre. */
export function daysUntil(isoDate: string): number {
  const target = new Date(isoDate);
  const today = new Date();
  target.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / 86_400_000);
}

/** Convertit une date de formulaire en chaine "AAAA-MM-JJ" attendue par l'API (type DateOnly). */
export function toDateOnly(value: Date | string | null | undefined): string | null {
  if (!value) {
    return null;
  }

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

/** Convertit une chaine "AAAA-MM-JJ" en Date locale pour les datepickers. */
export function fromDateOnly(value: string | null | undefined): Date | null {
  if (!value) {
    return null;
  }

  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) {
    return null;
  }

  return new Date(year, month - 1, day);
}

/** Declenche le telechargement d'un blob recu de l'API. */
export function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}
