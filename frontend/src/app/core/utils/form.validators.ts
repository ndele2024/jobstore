import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

/**
 * Validateurs reutilisables par tous les formulaires de l'application.
 * Chaque validateur retourne une cle d'erreur exploitee par `formErrorMessage`.
 */

/** Verifie que deux champs (mot de passe / confirmation) sont identiques. */
export function matchFields(source: string, target: string): ValidatorFn {
  return (group: AbstractControl): ValidationErrors | null => {
    const first = group.get(source);
    const second = group.get(target);

    if (!first || !second || !second.value) {
      return null;
    }

    if (first.value === second.value) {
      // Ne pas effacer une autre erreur eventuellement posee sur le champ.
      if (second.hasError('fieldsMismatch')) {
        const { fieldsMismatch, ...rest } = second.errors ?? {};
        second.setErrors(Object.keys(rest).length ? rest : null);
      }
      return null;
    }

    second.setErrors({ ...(second.errors ?? {}), fieldsMismatch: true });
    return { fieldsMismatch: true };
  };
}

/** Mot de passe: au moins 8 caracteres, une lettre et un chiffre. */
export function strongPassword(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = control.value as string | null;
    if (!value) {
      return null;
    }

    const hasLetter = /[a-zA-Z]/.test(value);
    const hasDigit = /\d/.test(value);

    return value.length >= 8 && hasLetter && hasDigit ? null : { weakPassword: true };
  };
}

/** Numero de telephone nord-americain ou international, souple sur la mise en forme. */
export function phoneNumber(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = (control.value as string | null)?.trim();
    if (!value) {
      return null;
    }

    return /^\+?[\d\s\-().]{8,20}$/.test(value) ? null : { phone: true };
  };
}

/** Code de verification a 6 chiffres. */
export function verificationCode(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = (control.value as string | null)?.trim();
    if (!value) {
      return null;
    }

    return /^\d{6}$/.test(value) ? null : { verificationCode: true };
  };
}

/** La date de fin ne doit pas preceder la date de debut. */
export function dateRange(startField: string, endField: string, currentField?: string): ValidatorFn {
  return (group: AbstractControl): ValidationErrors | null => {
    const start = group.get(startField)?.value as Date | null;
    const end = group.get(endField)?.value as Date | null;
    const isCurrent = currentField ? Boolean(group.get(currentField)?.value) : false;

    if (isCurrent || !start || !end) {
      return null;
    }

    return new Date(end) >= new Date(start) ? null : { dateRange: true };
  };
}

/** Le salaire maximum doit rester superieur ou egal au minimum. */
export function salaryRange(minField: string, maxField: string): ValidatorFn {
  return (group: AbstractControl): ValidationErrors | null => {
    const min = group.get(minField)?.value as number | null;
    const max = group.get(maxField)?.value as number | null;

    if (min === null || max === null || min === undefined || max === undefined) {
      return null;
    }

    return Number(max) >= Number(min) ? null : { salaryRange: true };
  };
}

/** Au moins un element selectionne dans une liste. */
export function minimumItems(count: number): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = control.value as unknown[] | null;
    return (value?.length ?? 0) >= count ? null : { minimumItems: { required: count } };
  };
}

/**
 * Message d'erreur affiche sous un champ.
 * Centralise ici pour garantir une formulation coherente dans toute l'application.
 */
export function formErrorMessage(control: AbstractControl | null, label = 'Ce champ'): string {
  if (!control?.errors) {
    return '';
  }

  const errors = control.errors;

  if (errors['required']) return `${label} est obligatoire.`;
  if (errors['email']) return 'Adresse courriel invalide.';
  if (errors['phone']) return 'Numero de telephone invalide.';
  if (errors['weakPassword'])
    return 'Le mot de passe doit contenir au moins 8 caracteres, une lettre et un chiffre.';
  if (errors['fieldsMismatch']) return 'Les deux valeurs ne correspondent pas.';
  if (errors['verificationCode']) return 'Le code doit contenir exactement 6 chiffres.';
  if (errors['minlength'])
    return `${label} doit contenir au moins ${errors['minlength'].requiredLength} caracteres.`;
  if (errors['maxlength'])
    return `${label} ne doit pas depasser ${errors['maxlength'].requiredLength} caracteres.`;
  if (errors['min']) return `La valeur minimale est ${errors['min'].min}.`;
  if (errors['max']) return `La valeur maximale est ${errors['max'].max}.`;
  if (errors['minimumItems'])
    return `Selectionnez au moins ${errors['minimumItems'].required} element(s).`;
  if (errors['pattern']) return `${label} n'a pas le format attendu.`;

  return 'Valeur invalide.';
}
