export interface InviteEmailsValidationResult {
  emails: string[];
  error: string | null;
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function parseInviteEmails(rawValue: string): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  const parts = rawValue
    .split(/[\n,]+/)
    .map((value) => value.trim().toLowerCase())
    .filter((value) => value.length > 0);

  for (const email of parts) {
    if (seen.has(email)) {
      continue;
    }

    seen.add(email);
    result.push(email);
  }

  return result;
}

export function validateInviteEmails(rawValue: string): InviteEmailsValidationResult {
  const emails = parseInviteEmails(rawValue);

  if (emails.length === 0) {
    return {
      emails: [],
      error: 'Enter at least one email address.',
    };
  }

  const invalidEmail = emails.find((email) => !isValidEmail(email));
  if (invalidEmail) {
    return {
      emails,
      error: `Invalid email: ${invalidEmail}`,
    };
  }

  return {
    emails,
    error: null,
  };
}