/**
 * Contrats echanges avec l'API JobStore.
 * Les interfaces refletent exactement les DTO C# du projet JobStore.Application.
 * Les enums numeriques correspondent aux enums du projet JobStore.Domain.
 */

// ---------------------------------------------------------------------------
// Enums (memes valeurs que cote backend)
// ---------------------------------------------------------------------------

export enum UserRole {
  Employee = 1,
  Employer = 2,
  Admin = 3,
}

export enum JobStatus {
  Draft = 1,
  Published = 2,
  Closed = 3,
  Deleted = 4,
  External = 5,
}

export enum ApplicationStatus {
  Submitted = 1,
  InReview = 2,
  Shortlisted = 3,
  Rejected = 4,
  Accepted = 5,
}

export enum LanguageLevel {
  Beginner = 1,
  Intermediate = 2,
  Advanced = 3,
  Fluent = 4,
  Native = 5,
}

export enum ContractType {
  FullTime = 1,
  PartTime = 2,
  Contract = 3,
  Internship = 4,
  Freelance = 5,
}

export enum WorkMode {
  OnSite = 1,
  Hybrid = 2,
  Remote = 3,
}

// ---------------------------------------------------------------------------
// Authentification
// ---------------------------------------------------------------------------

export interface RegisterEmployeeRequest {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  addressLine: string;
  city: string;
  country: string;
  postalCode: string;
  password: string;
  confirmPassword: string;
}

export interface RegisterEmployerRequest {
  companyName: string;
  email: string;
  phone: string;
  addressLine: string;
  city: string;
  country: string;
  postalCode: string;
  websiteUrl: string;
  sectors: string[];
  password: string;
  confirmPassword: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

/** Reponse renvoyee des qu'un code a 6 chiffres est envoye par courriel. */
export interface VerificationChallenge {
  challengeId: string;
  email: string;
  expiresAtUtc: string;
  /** Code en clair, expose uniquement quand le backend est en mode developpement. */
  devCode?: string | null;
  message: string;
}

export interface VerifyCodeRequest {
  challengeId: string;
  code: string;
}

export interface AuthUser {
  id: string;
  role: UserRole;
  displayName: string;
  email: string;
  firstName: string;
  lastName: string;
  companyName: string;
  emailVerified: boolean;
}

export interface AuthResponse {
  accessToken: string;
  expiresAtUtc: string;
  user: AuthUser;
}

export interface ChangeEmailRequest {
  newEmail: string;
  currentPassword: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

// ---------------------------------------------------------------------------
// Profil candidat
// ---------------------------------------------------------------------------

export interface UpdatePersonalInfoRequest {
  firstName: string;
  lastName: string;
  phone: string;
  addressLine: string;
  city: string;
  country: string;
  postalCode: string;
  headline: string;
  summary: string;
}

export interface EducationRequest {
  schoolName: string;
  city: string;
  country: string;
  diplomaName: string;
  fieldOfStudy: string;
  startDate: string;
  endDate: string | null;
  isCurrent: boolean;
  diplomaObtained: boolean;
  expectedGraduationDate: string | null;
  accumulatedCredits: number | null;
  gpa: number | null;
}

export interface Education extends EducationRequest {
  id: string;
}

export interface ExperienceRequest {
  jobTitle: string;
  companyName: string;
  city: string;
  country: string;
  startDate: string;
  endDate: string | null;
  isCurrent: boolean;
  tasks: string[];
}

export interface Experience extends ExperienceRequest {
  id: string;
}

export interface LanguageRequest {
  name: string;
  level: LanguageLevel;
}

export interface LanguageSkill extends LanguageRequest {
  id: string;
}

export interface CertificationRequest {
  name: string;
  issuer: string;
  issueDate: string | null;
  expirationDate: string | null;
  credentialId: string;
}

export interface Certification extends CertificationRequest {
  id: string;
}

export interface Resume {
  id: string;
  fileName: string;
  contentType: string;
  sizeInBytes: number;
  isDefault: boolean;
  uploadedAtUtc: string;
}

/** Donnees detectees dans un CV, proposees en pre-remplissage du profil. */
export interface ResumeParsingResult {
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  city: string | null;
  country: string | null;
  skills: string[];
  languages: string[];
  experiences: ExperienceRequest[];
  educations: EducationRequest[];
  rawTextPreview: string;
  supported: boolean;
  message: string;
}

export interface ResumeUploadResponse {
  resume: Resume;
  parsed: ResumeParsingResult;
}

export interface EmployeeProfile {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  addressLine: string;
  city: string;
  country: string;
  postalCode: string;
  headline: string;
  summary: string;
  skills: string[];
  educations: Education[];
  experiences: Experience[];
  languages: LanguageSkill[];
  certifications: Certification[];
  resumes: Resume[];
  completionPercentage: number;
}

export interface UpdateEmployerInfoRequest {
  companyName: string;
  phone: string;
  addressLine: string;
  city: string;
  country: string;
  postalCode: string;
  websiteUrl: string;
  sectors: string[];
  headline: string;
  summary: string;
}

export interface EmployerProfile {
  id: string;
  companyName: string;
  email: string;
  phone: string;
  addressLine: string;
  city: string;
  country: string;
  postalCode: string;
  websiteUrl: string;
  sectors: string[];
  headline: string;
  summary: string;
}

// ---------------------------------------------------------------------------
// Offres
// ---------------------------------------------------------------------------

export interface JobSearchCriteria {
  keyword?: string | null;
  domain?: string | null;
  city?: string | null;
  country?: string | null;
  sector?: string | null;
  minimumSalary?: number | null;
  contractType?: ContractType | null;
  workMode?: WorkMode | null;
  sortBy?: string | null;
  page?: number;
  pageSize?: number;
}

export interface JobCard {
  id: string;
  title: string;
  employerName: string;
  domain: string;
  sector: string;
  city: string;
  country: string;
  salaryMin: number;
  salaryMax: number;
  contractType: ContractType;
  workMode: WorkMode;
  displayUntil: string;
  status: JobStatus;
  isExternal: boolean;
  createdAtUtc: string;
  matchPercentage: number | null;
}

export interface JobSearchResponse {
  items: JobCard[];
  totalCount: number;
  page: number;
  pageSize: number;
}

export interface JobDetails {
  id: string;
  employerId: string;
  title: string;
  employerName: string;
  domain: string;
  sector: string;
  city: string;
  country: string;
  salaryMin: number;
  salaryMax: number;
  contractType: ContractType;
  workMode: WorkMode;
  startDate: string;
  displayUntil: string;
  description: string;
  requiredSkills: string[];
  responsibilities: string[];
  status: JobStatus;
  isExternal: boolean;
  externalApplyUrl: string;
  viewCount: number;
  applicationCount: number;
  createdAtUtc: string;
  matchPercentage: number | null;
  matchedSkills: string[];
  missingSkills: string[];
  hasApplied: boolean;
}

export interface UpsertJobRequest {
  title: string;
  domain: string;
  sector: string;
  city: string;
  country: string;
  salaryMin: number;
  salaryMax: number;
  contractType: ContractType;
  workMode: WorkMode;
  startDate: string;
  displayUntil: string;
  description: string;
  requiredSkills: string[];
  responsibilities: string[];
  status: JobStatus;
}

export interface JobApplicant {
  applicationId: string;
  employeeId: string;
  candidateName: string;
  email: string;
  phone: string;
  city: string;
  country: string;
  headline: string;
  resumeId: string | null;
  resumeName: string;
  coverLetter: string;
  status: ApplicationStatus;
  matchPercentage: number;
  matchedSkills: string[];
  missingSkills: string[];
  skills: string[];
  languages: LanguageSkill[];
  educations: Education[];
  experiences: Experience[];
  certifications: Certification[];
  employerNote: string;
  submittedAtUtc: string;
}

export interface JobViewer {
  userId: string;
  displayName: string;
  city: string;
  country: string;
  viewCount: number;
  hasApplied: boolean;
  lastViewedAtUtc: string;
}

export interface EmployerJobDetails {
  job: JobDetails;
  applicants: JobApplicant[];
  viewers: JobViewer[];
}

// ---------------------------------------------------------------------------
// Candidatures
// ---------------------------------------------------------------------------

export interface SubmitApplicationRequest {
  resumeId: string;
  coverLetter?: string | null;
  coverLetterFileName?: string | null;
}

export interface UpdateApplicationStatusRequest {
  status: ApplicationStatus;
  note?: string | null;
}

export interface MyApplication {
  id: string;
  jobId: string;
  jobTitle: string;
  employerName: string;
  city: string;
  country: string;
  status: ApplicationStatus;
  matchPercentage: number;
  resumeName: string;
  coverLetter: string;
  submittedAtUtc: string;
  updatedAtUtc: string;
  displayUntil: string;
}

// ---------------------------------------------------------------------------
// Tableaux de bord
// ---------------------------------------------------------------------------

export interface ProfileSummary {
  userId: string;
  displayName: string;
  role: UserRole;
  headline: string;
  location: string;
  email: string;
  phone: string;
  completionPercentage: number;
  skills: string[];
  languages: string[];
  missingProfileSections: string[];
}

export interface RecommendedJob {
  jobId: string;
  title: string;
  employerName: string;
  city: string;
  country: string;
  domain: string;
  salaryMin: number;
  salaryMax: number;
  matchPercentage: number;
  matchedSkills: string[];
  missingSkills: string[];
  displayUntil: string;
}

export interface ApplicationStatusCount {
  status: ApplicationStatus;
  count: number;
}

export interface EmployeeDashboard {
  profile: ProfileSummary;
  recommendations: RecommendedJob[];
  submittedApplications: number;
  viewedOffers: number;
  resumeCount: number;
  applicationsByStatus: ApplicationStatusCount[];
  recentApplications: MyApplication[];
}

export interface EmployerOfferStat {
  jobId: string;
  title: string;
  city: string;
  status: JobStatus;
  displayUntil: string;
  viewCount: number;
  applicationCount: number;
  newApplicationCount: number;
  bestMatchPercentage: number;
}

export interface EmployerDashboard {
  employerId: string;
  companyName: string;
  sectors: string[];
  totalOffers: number;
  activeOffers: number;
  draftOffers: number;
  closedOffers: number;
  totalApplications: number;
  newApplications: number;
  totalViews: number;
  applicationsByStatus: ApplicationStatusCount[];
  offers: EmployerOfferStat[];
}

export interface AdminUser {
  id: string;
  role: UserRole;
  displayName: string;
  email: string;
  phone: string;
  city: string;
  country: string;
  emailVerified: boolean;
  isActive: boolean;
  createdAtUtc: string;
  relatedOffers: number;
  relatedApplications: number;
}

export interface AdminDashboard {
  employeeCount: number;
  employerCount: number;
  adminCount: number;
  jobCount: number;
  publishedJobCount: number;
  externalJobCount: number;
  applicationCount: number;
  viewCount: number;
}

// ---------------------------------------------------------------------------
// Donnees de reference
// ---------------------------------------------------------------------------

export interface EnumOption {
  value: number;
  name: string;
  label: string;
}

export interface ReferenceData {
  domains: string[];
  sectors: string[];
  cities: string[];
  countries: string[];
  diplomas: string[];
  languages: string[];
  skills: string[];
  languageLevels: EnumOption[];
  contractTypes: EnumOption[];
  workModes: EnumOption[];
  jobStatuses: EnumOption[];
  applicationStatuses: EnumOption[];
}

/** Format d'erreur normalise renvoye par l'API. */
export interface ApiError {
  message: string;
  statusCode: number;
  errors?: Record<string, string[]>;
}
