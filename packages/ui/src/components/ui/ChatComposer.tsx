import {
  type ChangeEvent,
  type KeyboardEvent,
  useCallback,
  useState,
} from 'react';

import './ChatComposer.css';

interface ChatComposerProps {
  onSend: (content: string) => void | Promise<void>;
  sending?: boolean;
  placeholder?: string;
  /** Optional disabled state with a reason shown in a small banner. */
  disabledReason?: string;
  className?: string;
}

export function ChatComposer({
  onSend,
  sending = false,
  placeholder = 'Ask the assistant…',
  disabledReason,
  className,
}: ChatComposerProps) {
  const [value, setValue] = useState('');
  const disabled = Boolean(disabledReason);
  const canSend = !sending && !disabled && value.trim().length > 0;

  const submit = useCallback((): void => {
    if (!canSend) {
      return;
    }
    const text = value.trim();
    setValue('');
    void Promise.resolve(onSend(text));
  }, [canSend, onSend, value]);

  const handleChange = (event: ChangeEvent<HTMLTextAreaElement>): void => {
    setValue(event.target.value);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>): void => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      submit();
    }
  };

  const cls = ['aegis-composer', className ?? ''].filter(Boolean).join(' ');

  return (
    <form
      className={cls}
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
    >
      {disabledReason && (
        <div className="aegis-composer__banner" role="status">
          {disabledReason}
        </div>
      )}
      <div className="aegis-composer__row">
        <textarea
          className="aegis-composer__input"
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          rows={2}
          aria-label="Message"
        />
        <button
          type="submit"
          className="aegis-composer__send"
          disabled={!canSend}
          aria-label="Send message"
        >
          {sending ? (
            <span className="aegis-composer__sending" aria-hidden="true" />
          ) : (
            'Send'
          )}
        </button>
      </div>
      <div className="aegis-composer__hint">
        Enter to send · Shift+Enter for newline
      </div>
    </form>
  );
}

export default ChatComposer;
