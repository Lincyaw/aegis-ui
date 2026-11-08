import { type AegisStrings } from '../../locale';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+$/;

/** The error for a trimmed email address, or undefined when it is valid. */
export function emailError(
  email: string,
  strings: AegisStrings,
): string | undefined {
  if (email === '') {
    return strings.authEmailRequired;
  }
  return EMAIL_PATTERN.test(email) ? undefined : strings.authEmailInvalid;
}
