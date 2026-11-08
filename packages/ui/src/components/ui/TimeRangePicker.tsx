import { type ChangeEvent, type KeyboardEvent, useId, useState } from 'react';

import { Popover } from 'antd';

import { POPOVER_OVERFLOW } from '../../hooks/popoverOverflow';
import { useDialogPopover } from '../../hooks/useDialogPopover';
import {
  RELATIVE_TIME_PRESETS,
  type RelativeTimePreset,
  parseTimeRangeInput,
} from '../../lib/timeRange';
import { useStrings } from '../../locale';
import { Button } from './Button';
import { Chip } from './Chip';
import { TextField } from './TextField';
import './TimeRangePicker.css';

export interface TimeRangePickerProps {
  /** Canonical value — `now-15m` for relative, free-form chrono string otherwise. */
  value: string;
  onChange: (next: string) => void;
  /** Custom preset list. Defaults to `RELATIVE_TIME_PRESETS`. */
  presets?: RelativeTimePreset[];
  /** Custom 'now' for deterministic testing — defaults to `() => new Date()`. */
  now?: () => Date;
  /** Trigger placeholder when `value` is empty / unparseable. */
  placeholder?: string;
  /** Disabled state. */
  disabled?: boolean;
  /** The trigger's id, so a caller's `<label htmlFor>` can point at it. */
  id?: string;
  /**
   * Id of visible text that names the picker with its range, such as a
   * FormRow's label: give the row `labelBy='aria-labelledby'` and pass
   * `${controlId}-label`. A `<label for>` would replace the range in the
   * name.
   */
  'aria-labelledby'?: string;
  /** Ids of the text that describes the picker, such as a FormRow's description. */
  'aria-describedby'?: string;
  /** Optional className passed to the trigger button. */
  className?: string;
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

function toDatetimeLocal(d: Date): string {
  return `${String(d.getFullYear())}-${pad(d.getMonth() + 1)}-${pad(
    d.getDate(),
  )}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromDatetimeLocal(s: string): Date | null {
  if (s.length === 0) {
    return null;
  }
  const t = Date.parse(s);
  return Number.isFinite(t) ? new Date(t) : null;
}

function absoluteValueString(from: Date, to: Date): string {
  return `${from.toISOString()} to ${to.toISOString()}`;
}

export function TimeRangePicker({
  value,
  onChange,
  presets = RELATIVE_TIME_PRESETS,
  now,
  placeholder,
  disabled = false,
  id,
  'aria-labelledby': labelledBy,
  'aria-describedby': describedBy,
  className,
}: TimeRangePickerProps) {
  const strings = useStrings();
  const nowFn = now ?? ((): Date => new Date());
  const popover = useDialogPopover<HTMLDivElement>();
  const panelId = useId();
  const triggerLabelId = useId();
  const [input, setInput] = useState(value);

  const parsedValue = parseTimeRangeInput(value, nowFn());
  const parsedInput = parseTimeRangeInput(input, nowFn());

  const [absFrom, setAbsFrom] = useState<string>(
    parsedValue ? toDatetimeLocal(parsedValue.from) : '',
  );
  const [absTo, setAbsTo] = useState<string>(
    parsedValue ? toDatetimeLocal(parsedValue.to) : '',
  );

  const triggerLabel =
    parsedValue === null
      ? value.length > 0
        ? value
        : (placeholder ?? strings.timeRangePlaceholder)
      : parsedValue.kind === 'relative'
        ? strings.timeRangeLast(parsedValue)
        : `${strings.formatDateTime(parsedValue.from)} → ${strings.formatDateTime(parsedValue.to)}`;

  const handleOpen = (next: boolean): void => {
    popover.setOpen(next);
    if (next) {
      setInput(value);
      if (parsedValue) {
        setAbsFrom(toDatetimeLocal(parsedValue.from));
        setAbsTo(toDatetimeLocal(parsedValue.to));
      }
    }
  };

  const applyInput = (): void => {
    if (parsedInput) {
      onChange(input.trim());
      popover.close();
    }
  };

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>): void => {
    setInput(e.target.value);
  };

  const handleInputKeyDown = (e: KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === 'Enter') {
      e.preventDefault();
      applyInput();
    }
  };

  const absFromDate = fromDatetimeLocal(absFrom);
  const absToDate = fromDatetimeLocal(absTo);
  const absValid =
    absFromDate !== null &&
    absToDate !== null &&
    absFromDate.getTime() <= absToDate.getTime();

  const handleAbsApply = (): void => {
    if (absFromDate && absToDate && absValid) {
      onChange(absoluteValueString(absFromDate, absToDate));
      popover.close();
    }
  };

  const inputError =
    input.trim().length > 0 && !parsedInput ? strings.timeRangeUnparseable : '';

  const content = (
    <div
      ref={popover.panelRef}
      id={panelId}
      className="aegis-trp__pop"
      role="dialog"
      aria-label={strings.timeRange}
      tabIndex={-1}
    >
      <div className="aegis-trp__section">
        <TextField
          label={strings.timeRangeExpression}
          value={input}
          placeholder={strings.timeRangeExpressionPlaceholder}
          error={inputError.length > 0 ? inputError : undefined}
          onChange={handleInputChange}
          onKeyDown={handleInputKeyDown}
        />
        <div className="aegis-trp__row">
          <Button tone="secondary" disabled={!parsedInput} onClick={applyInput}>
            {strings.apply}
          </Button>
        </div>
      </div>

      <div className="aegis-trp__section">
        <div className="aegis-trp__hint">{strings.timeRangePresets}</div>
        <div className="aegis-trp__chips">
          {presets.map((p) => (
            <Chip
              key={p.value}
              tone={p.value === value ? 'ink' : 'default'}
              onClick={() => {
                onChange(p.value);
                popover.close();
              }}
            >
              {p.label}
            </Chip>
          ))}
        </div>
      </div>

      <div className="aegis-trp__section">
        <div className="aegis-trp__hint">{strings.timeRangeAbsolute}</div>
        <div className="aegis-trp__abs">
          <label className="aegis-trp__abs-field">
            <span className="aegis-trp__abs-label">
              {strings.timeRangeFrom}
            </span>
            <input
              type="datetime-local"
              className="aegis-trp__abs-input"
              value={absFrom}
              onChange={(e) => {
                setAbsFrom(e.target.value);
              }}
            />
          </label>
          <label className="aegis-trp__abs-field">
            <span className="aegis-trp__abs-label">{strings.timeRangeTo}</span>
            <input
              type="datetime-local"
              className="aegis-trp__abs-input"
              value={absTo}
              onChange={(e) => {
                setAbsTo(e.target.value);
              }}
            />
          </label>
          <Button
            tone="secondary"
            disabled={!absValid}
            onClick={handleAbsApply}
          >
            {strings.apply}
          </Button>
        </div>
      </div>
    </div>
  );

  const triggerCls = ['aegis-trp__trigger', className ?? '']
    .filter(Boolean)
    .join(' ');

  return (
    <Popover
      content={content}
      trigger="click"
      open={disabled ? false : popover.open}
      onOpenChange={handleOpen}
      placement="bottomLeft"
      autoAdjustOverflow={POPOVER_OVERFLOW}
      arrow={false}
      classNames={{ root: 'aegis-trp__overlay' }}
      destroyOnHidden
    >
      <button
        ref={popover.triggerRef}
        type="button"
        id={id}
        className={triggerCls}
        disabled={disabled}
        aria-haspopup="dialog"
        aria-expanded={popover.open}
        aria-controls={popover.open ? panelId : undefined}
        aria-labelledby={
          labelledBy === undefined
            ? undefined
            : `${labelledBy} ${triggerLabelId}`
        }
        aria-describedby={describedBy}
      >
        <span id={triggerLabelId} className="aegis-trp__trigger-label">
          {triggerLabel}
        </span>
        <span className="aegis-trp__trigger-caret" aria-hidden="true">
          ▾
        </span>
      </button>
    </Popover>
  );
}
