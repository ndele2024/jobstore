import {
  CertificationRequest,
  EducationRequest,
  EmployeeProfile,
  ExperienceRequest,
  ExtractedCertification,
  ExtractedEducation,
  ExtractedExperience,
  ExtractedLanguage,
  LanguageRequest,
  UpdatePersonalInfoRequest,
} from '../../../core/models/api.models';

/**
 * Regles de passage entre les donnees extraites d'un CV par l'IA
 * et les requetes d'enregistrement du profil.
 *
 * Un element "complet" peut etre enregistre directement: il respecte les memes
 * regles que les formulaires et que l'API. Un element incomplet est ouvert dans
 * sa boite de dialogue pre-remplie pour que le candidat termine la saisie.
 */

export type PersonalField = keyof UpdatePersonalInfoRequest;

/** Champs personnels proposes au pre-remplissage (le courriel se modifie via "Parametres du compte"). */
export const PERSONAL_FIELDS: { key: PersonalField; label: string }[] = [
  { key: 'firstName', label: 'Prénom' },
  { key: 'lastName', label: 'Nom' },
  { key: 'phone', label: 'Téléphone' },
  { key: 'addressLine', label: 'Adresse' },
  { key: 'city', label: 'Ville' },
  { key: 'country', label: 'Pays' },
  { key: 'postalCode', label: 'Code postal' },
  { key: 'headline', label: 'Titre professionnel' },
  { key: 'summary', label: 'Présentation' },
];

/** Champs obligatoires de UpdatePersonalInfoRequest cote API. */
const REQUIRED_PERSONAL_FIELDS: PersonalField[] = ['firstName', 'lastName', 'phone', 'city', 'country'];

export function normalize(value: string | null | undefined): string {
  return (value ?? '').trim().toLowerCase();
}

// -- Completude --------------------------------------------------------------

export function isEducationComplete(e: ExtractedEducation): boolean {
  return Boolean(
    e.schoolName &&
      e.city &&
      e.country &&
      e.diplomaName &&
      e.fieldOfStudy &&
      e.startDate &&
      (e.isCurrent || e.endDate) &&
      (e.diplomaObtained === true || (e.diplomaObtained === false && e.expectedGraduationDate)),
  );
}

export function isExperienceComplete(x: ExtractedExperience): boolean {
  return Boolean(
    x.jobTitle && x.companyName && x.city && x.country && x.startDate && (x.isCurrent || x.endDate),
  );
}

export function isLanguageComplete(l: ExtractedLanguage): boolean {
  return Boolean(l.name && l.level);
}

export function isCertificationComplete(c: ExtractedCertification): boolean {
  return Boolean(c.name && c.issuer);
}

export function isPersonalInfoValid(info: UpdatePersonalInfoRequest): boolean {
  return REQUIRED_PERSONAL_FIELDS.every((key) => info[key].trim().length > 0);
}

// -- Doublons avec le profil existant ----------------------------------------

export function isDuplicateEducation(e: ExtractedEducation, profile: EmployeeProfile): boolean {
  return profile.educations.some(
    (existing) =>
      normalize(existing.schoolName) === normalize(e.schoolName) &&
      normalize(existing.diplomaName) === normalize(e.diplomaName),
  );
}

export function isDuplicateExperience(x: ExtractedExperience, profile: EmployeeProfile): boolean {
  return profile.experiences.some(
    (existing) =>
      normalize(existing.jobTitle) === normalize(x.jobTitle) &&
      normalize(existing.companyName) === normalize(x.companyName),
  );
}

export function isDuplicateLanguage(l: ExtractedLanguage, profile: EmployeeProfile): boolean {
  return profile.languages.some((existing) => normalize(existing.name) === normalize(l.name));
}

export function isDuplicateCertification(c: ExtractedCertification, profile: EmployeeProfile): boolean {
  return profile.certifications.some((existing) => normalize(existing.name) === normalize(c.name));
}

// -- Conversion vers les requetes (a n'appeler que sur un element complet) --

export function toEducationRequest(e: ExtractedEducation): EducationRequest {
  return {
    schoolName: e.schoolName!,
    city: e.city!,
    country: e.country!,
    diplomaName: e.diplomaName!,
    fieldOfStudy: e.fieldOfStudy!,
    startDate: e.startDate!,
    endDate: e.isCurrent ? null : e.endDate,
    isCurrent: e.isCurrent,
    diplomaObtained: e.diplomaObtained === true,
    expectedGraduationDate: e.diplomaObtained === true ? null : e.expectedGraduationDate,
    accumulatedCredits: e.accumulatedCredits,
    gpa: e.gpa,
  };
}

export function toExperienceRequest(x: ExtractedExperience): ExperienceRequest {
  return {
    jobTitle: x.jobTitle!,
    companyName: x.companyName!,
    city: x.city!,
    country: x.country!,
    startDate: x.startDate!,
    endDate: x.isCurrent ? null : x.endDate,
    isCurrent: x.isCurrent,
    tasks: x.tasks,
  };
}

export function toLanguageRequest(l: ExtractedLanguage): LanguageRequest {
  return { name: l.name, level: l.level! };
}

export function toCertificationRequest(c: ExtractedCertification): CertificationRequest {
  return {
    name: c.name,
    issuer: c.issuer!,
    issueDate: c.issueDate,
    expirationDate: c.expirationDate,
    credentialId: c.credentialId ?? '',
  };
}
