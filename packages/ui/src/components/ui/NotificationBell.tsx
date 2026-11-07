import { type ReactElement, useState } from 'react';

import { BellOutlined } from '@ant-design/icons';
import { Popover } from 'antd';

import { useAegisAction } from '../../agent/core/hooks';
import type { AegisAction } from '../../agent/core/types';
import type { AegisNotification } from '../../notifications';
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
}: NotificationBellProps): ReactElement {
  const [open, setOpen] = useState(false);
  const bound = useAegisAction<void, unknown>(action);

  const preview = items.slice(0, MAX_PREVIEW_ITEMS);

  const handleItemClick = (item: AegisNotification): void => {
    setOpen(false);
    onOpen?.(item);
  };

  const content = (
    <div className="aegis-notif-pop" style={{ width }}>
      <div className="aegis-notif-pop__head">
        <span className="aegis-notif-pop__title">Notifications</span>
        {unreadCount > 0 && (
          <span className="aegis-notif-pop__count">{unreadCount} unread</span>
        )}
      </div>
      {preview.length === 0 ? (
        <div className="aegis-notif-pop__empty">You&apos;re all caught up.</div>
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
                      {relativeTime(item.timestamp)}
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
      <div
        className="aegis-notif-pop__foot"
        onClickCapture={() => {
          setOpen(false);
        }}
      >
        <LinkImpl to={inboxPath} className="aegis-notif-pop__view-all">
          View all
        </LinkImpl>
      </div>
    </div>
  );

  return (
    <Popover
      content={content}
      trigger="click"
      open={open}
      onOpenChange={setOpen}
      placement="bottomRight"
      arrow={false}
      classNames={{ root: 'aegis-notif-pop__overlay' }}
    >
      <button
        type="button"
        className="aegis-notif-bell"
        aria-label={
          unreadCount > 0
            ? `Notifications: ${String(unreadCount)} unread`
            : 'Notifications'
        }
        data-agent-action-id={action?.id}
        onClick={action ? () => void bound.invoke() : undefined}
      >
        <BellOutlined className="aegis-notif-bell__icon" />
        {unreadCount > 0 && (
          <span className="aegis-notif-bell__badge" aria-hidden="true">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>
    </Popover>
  );
}
