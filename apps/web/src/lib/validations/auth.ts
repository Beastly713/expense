export interface SignupFormValues {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export interface LoginFormValues {
  email: string;
  password: string;
}

export interface ForgotPasswordFormValues {
  email: string;
}

export interface ResetPasswordFormValues {
  password: string;
  confirmPassword: string;
}

export interface AuthFormErrors {
  name?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
  form?: string;
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function validateSignupForm(values: SignupFormValues): AuthFormErrors {
  const errors: AuthFormErrors = {};

  if (values.name.trim().length < 2) {
    errors.name = 'Full name must be at least 2 characters.';
  }

  if (!isValidEmail(values.email.trim())) {
    errors.email = 'Enter a valid email address.';
  }

  if (values.password.length < 8) {
    errors.password = 'Password must be at least 8 characters.';
  }

  if (values.confirmPassword !== values.password) {
    errors.confirmPassword = 'Passwords do not match.';
  }

  return errors;
}

export function validateLoginForm(values: LoginFormValues): AuthFormErrors {
  const errors: AuthFormErrors = {};

  if (!isValidEmail(values.email.trim())) {
    errors.email = 'Enter a valid email address.';
  }

  if (values.password.length < 8) {
    errors.password = 'Password must be at least 8 characters.';
  }

  return errors;
}

export function validateForgotPasswordForm(
  values: ForgotPasswordFormValues,
): AuthFormErrors {
  const errors: AuthFormErrors = {};

  if (!isValidEmail(values.email.trim())) {
    errors.email = 'Enter a valid email address.';
  }

  return errors;
}

export function validateResetPasswordForm(
  values: ResetPasswordFormValues,
): AuthFormErrors {
  const errors: AuthFormErrors = {};

  if (values.password.length < 8) {
    errors.password = 'Password must be at least 8 characters.';
  }

  if (values.confirmPassword !== values.password) {
    errors.confirmPassword = 'Passwords do not match.';
  }

  return errors;
}