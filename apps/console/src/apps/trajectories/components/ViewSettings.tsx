import { type ReactElement, useState } from 'react';

import { Chip, MetricLabel } from '@lincyaw/aegis-ui';

import type { CustomSpanRule, PrimaryView, TrajectoriesPrefs } from '../prefs';
import { ALL_SPAN_KINDS, type SpanKind } from '../spanKind';

import './ViewSettings.css';

interface ViewSettingsProps {
  prefs: TrajectoriesPrefs;
  setPrefs: (patch: Partial<TrajectoriesPrefs>) => void;
  reset: () => void;
  onClose: () => void;
}

export function ViewSettings({
  prefs,
  setPrefs,
  reset,
  onClose,
}: ViewSettingsProps): ReactElement {
  const [draftPattern, setDraftPattern] = useState('');
  const [draftKind, setDraftKind] = useState<SpanKind>('tool');

  const addRule = (): void => {
    const pattern = draftPattern.trim();
    if (!pattern) {
      return;
    }
    const next: CustomSpanRule[] = [
      ...prefs.customSpanRules,
      { pattern, kind: draftKind },
    ];
    setPrefs({ customSpanRules: next });
    setDraftPattern('');
  };

  const removeRule = (index: number): void => {
    const next = prefs.customSpanRules.filter((_, i) => i !== index);
    setPrefs({ customSpanRules: next });
  };

  return (
    <div
      className='aegis-view-settings__backdrop'
      role='dialog'
      aria-label='View settings'
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className='aegis-view-settings'>
        <header className='aegis-view-settings__header'>
          <h2 className='aegis-view-settings__title'>View settings</h2>
          <button
            type='button'
            className='aegis-view-settings__close'
            onClick={onClose}
            aria-label='Close'
          >
            ×
          </button>
        </header>

        <section className='aegis-view-settings__section'>
          <MetricLabel size='xs'>default view</MetricLabel>
          <div className='aegis-view-settings__chips'>
            {(['storyline', 'trace'] as PrimaryView[]).map((v) => (
              <Chip
                key={v}
                tone={prefs.defaultView === v ? 'ink' : 'default'}
                onClick={() => setPrefs({ defaultView: v })}
              >
                {v}
              </Chip>
            ))}
          </div>
        </section>

        <section className='aegis-view-settings__section'>
          <MetricLabel size='xs'>custom span rules</MetricLabel>
          <p className='aegis-view-settings__hint'>
            Re-bucket spans whose <code>SpanName</code> matches a substring.
            First match wins; built-in <code>agentm.*</code> classification
            applies as the fallback.
          </p>
          <ul className='aegis-view-settings__rules'>
            {prefs.customSpanRules.length === 0 && (
              <li className='aegis-view-settings__rule-empty'>
                No custom rules — built-in classification is in effect.
              </li>
            )}
            {prefs.customSpanRules.map((rule, i) => (
              <li
                className='aegis-view-settings__rule'
                key={`${rule.pattern}-${i.toString()}`}
              >
                <code className='aegis-view-settings__pattern'>
                  {rule.pattern}
                </code>
                <span className='aegis-view-settings__arrow'>→</span>
                <Chip tone='ink'>{rule.kind}</Chip>
                <button
                  type='button'
                  className='aegis-view-settings__remove'
                  onClick={() => removeRule(i)}
                  aria-label='Remove rule'
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
          <form
            className='aegis-view-settings__add'
            onSubmit={(e) => {
              e.preventDefault();
              addRule();
            }}
          >
            <input
              type='text'
              className='aegis-view-settings__input'
              placeholder='SpanName substring (e.g. my-agent.step)'
              value={draftPattern}
              onChange={(e) => setDraftPattern(e.target.value)}
            />
            <select
              className='aegis-view-settings__select'
              value={draftKind}
              onChange={(e) => setDraftKind(e.target.value as SpanKind)}
            >
              {ALL_SPAN_KINDS.map((k) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
            </select>
            <button
              type='submit'
              className='aegis-view-settings__add-btn'
              disabled={!draftPattern.trim()}
            >
              Add
            </button>
          </form>
        </section>

        <footer className='aegis-view-settings__footer'>
          <button
            type='button'
            className='aegis-view-settings__reset'
            onClick={reset}
          >
            Reset to defaults
          </button>
        </footer>
      </div>
    </div>
  );
}

export default ViewSettings;
