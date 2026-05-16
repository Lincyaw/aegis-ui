import { type ChangeEvent, type KeyboardEvent, useState } from 'react';

import { Popover } from 'antd';

import {
  RELATIVE_TIME_PRESETS,
  type RelativeTimePreset,
  parseTimeRangeInput,
} from '../../lib/timeRange';
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
  placeholder = 'Select range',
  disabled = false,
  className,
}: TimeRangePickerProps) {
  const nowFn = now ?? ((): Date => new Date());
  const [open, setOpen] = useState(false);
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
    parsedValue?.label ?? (value.length > 0 ? value : placeholder);

  const handleOpen = (next: boolean): void => {
    setOpen(next);
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
      setOpen(false);
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
      setOpen(false);
    }
  };

  const inputError =
    input.trim().length > 0 && !parsedInput ? 'Unparseable expression' : '';

  const content = (
    <div className="aegis-trp__pop">
      <div className="aegis-trp__section">
        <TextField
          label="Expression"
          value={input}
          placeholder="now-15m, yesterday 10am to today 11am, …"
          error={inputError.length > 0 ? inputError : undefined}
          onChange={handleInputChange}
          onKeyDown={handleInputKeyDown}
        />
        <div className="aegis-trp__row">
          <Button tone="secondary" disabled={!parsedInput} onClick={applyInput}>
            Apply
          </Button>
        </div>
      </div>

      <div className="aegis-trp__section">
        <div className="aegis-trp__hint">Quick presets</div>
        <div className="aegis-trp__chips">
          {presets.map((p) => (
            <Chip
              key={p.value}
              tone={p.value === value ? 'ink' : 'default'}
              onClick={() => {
                onChange(p.value);
                setOpen(false);
              }}
            >
              {p.label}
            </Chip>
          ))}
        </div>
      </div>

      <div className="aegis-trp__section">
        <div className="aegis-trp__hint">Absolute range</div>
        <div className="aegis-trp__abs">
          <label className="aegis-trp__abs-field">
            <span className="aegis-trp__abs-label">From</span>
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
            <span className="aegis-trp__abs-label">To</span>
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
            Apply
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
      open={disabled ? false : open}
      onOpenChange={handleOpen}
      placement="bottomLeft"
      arrow={false}
      overlayClassName="aegis-trp__overlay"
      destroyTooltipOnHide
    >
      <button
        type="button"
        className={triggerCls}
        disabled={disabled}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <span className="aegis-trp__trigger-label">{triggerLabel}</span>
        <span className="aegis-trp__trigger-caret" aria-hidden="true">
          ▾
        </span>
      </button>
    </Popover>
  );
}

export default TimeRangePicker;
