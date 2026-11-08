import { type CSSProperties, useId } from 'react';

import './Slider.css';

interface SliderProps {
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step?: number;
  label?: string;
  /** Accessible name for a slider shown without a visible label. */
  ariaLabel?: string;
  /** How the value reads beside the label and to assistive tech, e.g. `${v}%`. */
  formatValue?: (value: number) => string;
  disabled?: boolean;
  id?: string;
  /** Ids of the text that describes the slider, such as a FormRow's description. */
  'aria-describedby'?: string;
  className?: string;
}

/**
 * One number picked along a range, on a native range input: arrow keys,
 * PageUp / PageDown and Home / End move it, and the current value is shown
 * above the track.
 */
export function Slider({
  value,
  onChange,
  min,
  max,
  step = 1,
  label,
  ariaLabel,
  formatValue = String,
  disabled = false,
  id,
  'aria-describedby': describedBy,
  className,
}: SliderProps) {
  const reactId = useId();
  const inputId = id ?? `aegis-slider-${reactId}`;
  const shown = formatValue(value);
  const fill = max > min ? ((value - min) / (max - min)) * 100 : 0;
  const cls = [
    'aegis-slider',
    disabled ? 'aegis-slider--disabled' : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ');
  return (
    <div className={cls} data-aegis-field>
      <div className="aegis-slider__head">
        {label !== undefined && (
          <label htmlFor={inputId} className="aegis-slider__label">
            {label}
          </label>
        )}
        <span className="aegis-slider__value" aria-hidden="true">
          {shown}
        </span>
      </div>
      <input
        type="range"
        id={inputId}
        className="aegis-slider__input"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        aria-label={label === undefined ? ariaLabel : undefined}
        aria-valuetext={shown}
        aria-describedby={describedBy}
        style={
          {
            '--aegis-slider-fill': `${String(Math.min(100, Math.max(0, fill)))}%`,
          } as CSSProperties
        }
        onChange={(event) => {
          onChange(Number(event.target.value));
        }}
      />
    </div>
  );
}
