import { Chip } from './Chip';
import './CommandInvocationCard.css';
import { MonoValue } from './MonoValue';
import { StatusDot } from './StatusDot';

interface CommandInvocationCardProps {
  commandId: string;
  args?: unknown;
  status: 'pending' | 'success' | 'error';
  error?: string;
  onUndo?: () => void;
  className?: string;
}

function formatArgs(args: unknown): string {
  if (args === undefined) {
    return '';
  }
  try {
    return JSON.stringify(args);
  } catch {
    return String(args);
  }
}

const STATUS_TONE: Record<
  CommandInvocationCardProps['status'],
  'ink' | 'warning' | 'muted'
> = {
  pending: 'muted',
  success: 'ink',
  error: 'warning',
};

const STATUS_LABEL: Record<CommandInvocationCardProps['status'], string> = {
  pending: 'pending',
  success: 'done',
  error: 'failed',
};

export function CommandInvocationCard({
  commandId,
  args,
  status,
  error,
  onUndo,
  className,
}: CommandInvocationCardProps) {
  const cls = ['aegis-cmd-card', `aegis-cmd-card--${status}`, className ?? '']
    .filter(Boolean)
    .join(' ');

  const argsStr = formatArgs(args);

  return (
    <div className={cls}>
      <div className="aegis-cmd-card__head">
        <span className="aegis-cmd-card__id">
          <MonoValue size="sm">{commandId}</MonoValue>
        </span>
        <span className="aegis-cmd-card__status">
          <StatusDot tone={STATUS_TONE[status]} pulse={status === 'pending'} />
          <Chip tone={status === 'error' ? 'warning' : 'ghost'}>
            {STATUS_LABEL[status]}
          </Chip>
        </span>
      </div>
      {argsStr && (
        <div className="aegis-cmd-card__args">
          <MonoValue size="sm" weight="regular">
            {argsStr}
          </MonoValue>
        </div>
      )}
      {status === 'error' && error && (
        <div className="aegis-cmd-card__error">{error}</div>
      )}
      {onUndo && (
        <div className="aegis-cmd-card__actions">
          <button
            type="button"
            className="aegis-cmd-card__undo"
            onClick={onUndo}
          >
            Undo
          </button>
        </div>
      )}
    </div>
  );
}

export default CommandInvocationCard;
