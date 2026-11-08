const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+$/;

export const EMAIL_REQUIRED = 'Enter your email address.';

/** The error for a trimmed email address, or undefined when it is valid. */
export function emailError(email: string): string | undefined {
  if (email === '') {
    return EMAIL_REQUIRED;
  }
  return EMAIL_PATTERN.test(email) ? undefined : 'Enter a valid email address.';
}
