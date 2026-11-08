import { type KeyboardEvent, type ReactNode, useState } from 'react';

import './NumberField.css';
import { TextField } from './TextField';

interface NumberFieldProps {
  /** `undefined` when the field is empty or its text is not a number. */
  value: number | undefined;
  onChange: (value: number | undefined) => void;
  label?: string;
  /** Accessible name for a field shown without a visible label. */
  ariaLabel?: string;
  /** Whole numbers only: a decimal is refused, as a backend `int` field would. */
  integer?: boolean;
  /** Bounds for the arrow keys, announced to assistive tech. A typed value outside them is still passed on, for the host to judge. */
  min?: number;
  max?: number;
  /** What the arrow keys add or take away; PageUp / PageDown move ten steps. */
  step?: number;
  /** Unit shown inside the field, e.g. `ms`. */
  unit?: ReactNode;
  placeholder?: string;
  helperText?: ReactNode;
  /** A problem the host found with the value, e.g. out of range. */
  error?: string;
  disabled?: boolean;
  id?: string;
  /** Ids of the text that describes the field, such as a FormRow's description; read before the field's own helper or error text. */
  'aria-describedby'?: string;
  className?: string;
}

const INTEGER = /^-?\d+$/;
const DECIMAL = /^-?(\d+\.?\d*|\.\d+)$/;
/** Text that may still become a number as the user keeps typing. */
const PARTIAL_INTEGER = /^-?$/;
const PARTIAL_DECIMAL = /^-?\.?$/;

function format(value: number | undefined): string {
  return value === undefined ? '' : String(value);
}

function clamp(value: number, min?: number, max?: number): number {
  return Math.min(max ?? Infinity, Math.max(min ?? -Infinity, value));
}

/**
 * A text field for one number. It keeps the text as typed, hands the host
 * the parsed number (or `undefined`), and says itself when the text is not
 * a number of the right kind, since the host never sees that text.
 */
export function NumberField({
  value,
  onChange,
  label,
  ariaLabel,
  integer = false,
  min,
  max,
  step = 1,
  unit,
  placeholder,
  helperText,
  error,
  disabled = false,
  id,
  'aria-describedby': describedBy,
  className,
}: NumberFieldProps) {
  const pattern = integer ? INTEGER : DECIMAL;
  const parse = (raw: string): number | undefined =>
    pattern.test(raw.trim()) ? Number(raw.trim()) : undefined;

  const [text, setText] = useState(() => format(value));
  const [shownValue, setShownValue] = useState(value);
  if (value !== shownValue) {
    setShownValue(value);
    if (value !== parse(text)) {
      setText(format(value));
    }
  }

  const parsed = parse(text);
  const partial = (integer ? PARTIAL_INTEGER : PARTIAL_DECIMAL).test(
    text.trim(),
  );
  const formatError =
    partial || parsed !== undefined
      ? undefined
      : integer
        ? 'Enter a whole number'
        : 'Enter a number';

  const edit = (next: string): void => {
    const nextValue = parse(next);
    setText(next);
    setShownValue(nextValue);
    onChange(nextValue);
  };

  const stepBy = (steps: number): void => {
    const from = parsed ?? min ?? 0;
    const next = clamp(from + steps * step, min, max);
    setText(format(next));
    setShownValue(next);
    onChange(next);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>): void => {
    const steps: Partial<Record<string, number>> = {
      ArrowUp: 1,
      ArrowDown: -1,
      PageUp: 10,
      PageDown: -10,
    };
    const by = steps[event.key];
    if (by !== undefined) {
      event.preventDefault();
      stepBy(by);
    }
  };

  const allowsNegative = min === undefined || min < 0;
  const inputMode = allowsNegative ? 'text' : integer ? 'numeric' : 'decimal';
  const cls = ['aegis-number-field', className ?? ''].filter(Boolean).join(' ');

  return (
    <TextField
      className={cls}
      id={id}
      label={label}
      aria-label={label === undefined ? ariaLabel : undefined}
      aria-describedby={describedBy}
      role="spinbutton"
      aria-valuenow={parsed}
      aria-valuemin={min}
      aria-valuemax={max}
      inputMode={inputMode}
      autoComplete="off"
      value={text}
      placeholder={placeholder}
      disabled={disabled}
      error={formatError ?? error}
      helperText={helperText}
      trailingIcon={unit}
      onChange={(event) => {
        edit(event.target.value);
      }}
      onKeyDown={onKeyDown}
    />
  );
}
