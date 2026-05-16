import type { ReactElement } from 'react';

import { KEYBOARD_SHORTCUTS } from '../useKeyboardNav';

import './ShortcutsHelp.css';

interface ShortcutsHelpProps {
  onClose: () => void;
}

export function ShortcutsHelp({ onClose }: ShortcutsHelpProps): ReactElement {
  return (
    <div
      className='aegis-shortcuts__backdrop'
      role='dialog'
      aria-label='Keyboard shortcuts'
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className='aegis-shortcuts'>
        <header className='aegis-shortcuts__header'>
          <h2 className='aegis-shortcuts__title'>Keyboard shortcuts</h2>
          <button
            type='button'
            className='aegis-shortcuts__close'
            onClick={onClose}
            aria-label='Close'
          >
            ×
          </button>
        </header>
        <dl className='aegis-shortcuts__list'>
          {KEYBOARD_SHORTCUTS.map((s) => (
            <div className='aegis-shortcuts__row' key={s.keys}>
              <dt>
                <kbd>{s.keys}</kbd>
              </dt>
              <dd>{s.desc}</dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}

export default ShortcutsHelp;
