export interface CreateGroupFormValues {
  name: string;
  defaultCurrency: string;
}

export interface CreateGroupFormErrors {
  name?: string;
  defaultCurrency?: string;
  form?: string;
}

function isValidCurrencyCode(value: string): boolean {
  return /^[A-Z]{3}$/.test(value.trim().toUpperCase());
}

export function validateCreateGroupForm(
  values: CreateGroupFormValues,
): CreateGroupFormErrors {
  const errors: CreateGroupFormErrors = {};

  if (values.name.trim().length < 2) {
    errors.name = 'Group name must be at least 2 characters.';
  }

  if (values.name.trim().length > 80) {
    errors.name = 'Group name must be 80 characters or fewer.';
  }

  if (!isValidCurrencyCode(values.defaultCurrency)) {
    errors.defaultCurrency = 'Enter a valid 3-letter currency code.';
  }

  return errors;
}