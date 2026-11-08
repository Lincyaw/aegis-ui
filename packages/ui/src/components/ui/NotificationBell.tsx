import { type ReactElement, useEffect, useId } from 'react';

import { BellOutlined, ExclamationCircleFilled } from '@ant-design/icons';
import { Popover } from 'antd';

import { useAegisAction } from '../../agent/core/hooks';
import type { AegisAction } from '../../agent/core/types';
import { POPOVER_OVERFLOW } from '../../hooks/popoverOverflow';
import { useDialogPopover } from '../../hooks/useDialogPopover';
import { useStrings } from '../../locale';
import type { AegisNotification } from '../../notifications';
import { Button } from './Button';
import { ErrorState } from './ErrorState';
import './NotificationBell.css';
import { DefaultLink, type LinkComponent } from './linkComponent';
import { relativeTime } from './relativeTime';

export interface NotificationBellProps {
  /** Newest first; the popover previews the first few. */
  items: AegisNotification[];
  /** Shown on the badge. Defaults to the number of unread `items`. */
  unreadCount?: number;
  /**
   * Fired when the user opens an item; the popover closes first. The host
   * marks it read and navigates to `item.to`.
   */
  onOpen?: (item: AegisNotification) => void;
  /** Path to the full inbox page, e.g. '/inbox'. */
  inboxPath: string;
  /** Renders the "View all" link. Defaults to an `<a href>`. */
  linkComponent?: LinkComponent;
  /** Override popover width in px. Defaults to 360. */
  width?: number;
  /** Optional aegis-ui agent action — fired when the bell is clicked. */
  action?: AegisAction<void, unknown>;
  /**
   * Set while live updates are failing: the bell shows a caution mark and
   * the popover says the items may be out of date. The count stays.
   */
  liveError?: Error | null;
  /**
   * Why loading failed. With no `items`, the bell shows the caution mark and
   * the popover says the notifications couldn't load; with `items`, it is
   * shown like `liveError`.
   */
  error?: Error | null;
  /**
   * Renders a retry button where the popover says loading failed or the
   * items may be out of date.
   */
  onRetry?: () => void;
}

const MAX_PREVIEW_ITEMS = 8;
const DEFAULT_WIDTH = 360;

export function NotificationBell({
  items,
  unreadCount = items.filter((n) => !n.read).length,
  onOpen,
  inboxPath,
  linkComponent: LinkImpl = DefaultLink,
  width = DEFAULT_WIDTH,
  action,
  liveError,
  error,
  onRetry,
}: NotificationBellProps): ReactElement {
  const strings = useStrings();
  const popover = useDialogPopover<HTMLDivElement>();
  const { open, focusPanel } = popover;
  const panelId = useId();
  const staleId = `${panelId}-stale`;
  const bound = useAegisAction<void, unknown>(action);

  const preview = items.slice(0, MAX_PREVIEW_ITEMS);
  const loadError = items.length === 0 ? (error ?? null) : null;
  const staleError = loadError ? null : (liveError ?? error ?? null);
  let caution: string | null = null;
  if (loadError) {
    caution = strings.notificationsLoadFailedNote(loadError.message);
  } else if (staleError) {
    caution = strings.notificationsStaleNote(staleError.message);
  }

  // A retry that works removes the retry button that had focus, which
  // would leave the open panel without it.
  useEffect(() => {
    if (open && document.activeElement === document.body) {
      focusPanel();
    }
  }, [loadError, staleError, open, focusPanel]);

  const handleItemClick = (item: AegisNotification): void => {
    popover.close();
    onOpen?.(item);
  };

  const content = (
    <div
      ref={popover.panelRef}
      id={panelId}
      className="aegis-notif-pop"
      style={{ width }}
      role="dialog"
      aria-labelledby={`${panelId}-title`}
      tabIndex={-1}
    >
      <div className="aegis-notif-pop__head">
        <span id={`${panelId}-title`} className="aegis-notif-pop__title">
          {strings.notifications}
        </span>
        {unreadCount > 0 && (
          <span className="aegis-notif-pop__count">
            {strings.unreadCount(unreadCount)}
          </span>
        )}
      </div>
      {staleError && (
        <div className="aegis-notif-pop__stale">
          <ExclamationCircleFilled
            className="aegis-notif-pop__stale-icon"
            aria-hidden
          />
          <div className="aegis-notif-pop__stale-body">
            <span>
              <span className="aegis-notif-pop__stale-title">
                {strings.notificationsStale}
              </span>{' '}
              {staleError.message}
            </span>
            {onRetry && (
              <Button tone="secondary" onClick={onRetry}>
                {strings.retry}
              </Button>
            )}
          </div>
        </div>
      )}
      {loadError ? (
        <ErrorState
          size="compact"
          title={strings.notificationsLoadFailed}
          description={loadError.message}
          action={
            onRetry && (
              <Button tone="secondary" onClick={onRetry}>
                {strings.retry}
              </Button>
            )
          }
        />
      ) : preview.length === 0 ? (
        <div className="aegis-notif-pop__empty">
          {strings.notificationsCaughtUp}
        </div>
      ) : (
        <ul className="aegis-notif-pop__list">
          {preview.map((item) => (
            <li key={item.id} className="aegis-notif-pop__item-wrap">
              <button
                type="button"
                className={[
                  'aegis-notif-pop__item',
                  item.read ? '' : 'aegis-notif-pop__item--unread',
                ]
                  .filter(Boolean)
                  .join(' ')}
                onClick={() => {
                  handleItemClick(item);
                }}
              >
                <span
                  className="aegis-notif-pop__dot"
                  aria-hidden="true"
                  data-unread={!item.read}
                />
                <span className="aegis-notif-pop__body">
                  <span className="aegis-notif-pop__row">
                    <span className="aegis-notif-pop__item-title">
                      {item.title}
                    </span>
                    <span className="aegis-notif-pop__time">
                      {relativeTime(item.timestamp, strings)}
                    </span>
                  </span>
                  {item.body && (
                    <span className="aegis-notif-pop__item-body">
                      {item.body}
                    </span>
                  )}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {/* Following the link closes the popover. */}
      <div className="aegis-notif-pop__foot" onClickCapture={popover.close}>
        <LinkImpl to={inboxPath} className="aegis-notif-pop__view-all">
          {strings.viewAll}
        </LinkImpl>
      </div>
    </div>
  );

  return (
    <Popover
      content={content}
      trigger="click"
      open={popover.open}
      onOpenChange={popover.setOpen}
      placement="bottomRight"
      autoAdjustOverflow={POPOVER_OVERFLOW}
      arrow={false}
      classNames={{ root: 'aegis-notif-pop__overlay' }}
    >
      {/* antd sets aria-describedby on its child to the popover's id, so
          the wrapper takes that and the bell keeps its own description. */}
      <span className="aegis-notif-bell__anchor">
        <button
          ref={popover.triggerRef}
          type="button"
          className="aegis-notif-bell"
          aria-describedby={caution ? staleId : undefined}
          aria-haspopup="dialog"
          aria-expanded={popover.open}
          aria-controls={popover.open ? panelId : undefined}
          aria-label={strings.notificationBellLabel(unreadCount)}
          data-agent-action-id={action?.id}
          onClick={action ? () => void bound.invoke() : undefined}
        >
          <BellOutlined className="aegis-notif-bell__icon" />
          {unreadCount > 0 && (
            <span className="aegis-notif-bell__badge" aria-hidden="true">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
          {caution && (
            <>
              <ExclamationCircleFilled
                className="aegis-notif-bell__stale"
                aria-hidden
              />
              <span id={staleId} className="aegis-notif-bell__description">
                {caution}
              </span>
            </>
          )}
        </button>
      </span>
    </Popover>
  );
}
