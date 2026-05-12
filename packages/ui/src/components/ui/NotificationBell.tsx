import { type ReactElement, useState } from 'react';

import { BellOutlined } from '@ant-design/icons';
import { Popover } from 'antd';
import { Link, useNavigate } from 'react-router-dom';

import { useAegisAction } from '../../agent/hooks';
import type { AegisAction } from '../../agent/types';
import { type AegisNotification, useNotifications } from '../../notifications';
import './NotificationBell.css';
import { relativeTime } from './relativeTime';

interface NotificationBellProps {
  /** Path to the full inbox page, e.g. '/inbox'. */
  inboxPath: string;
  /** Override popover width in px. Defaults to 360. */
  width?: number;
  /** Optional aegis-ui agent action — fired when the bell is clicked. */
  action?: AegisAction<void, unknown>;
}

const MAX_PREVIEW_ITEMS = 8;
const DEFAULT_WIDTH = 360;

export function NotificationBell({
  inboxPath,
  width = DEFAULT_WIDTH,
  action,
}: NotificationBellProps): ReactElement {
  const { items, unreadCount, markRead } = useNotifications();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const bound = useAegisAction<void, unknown>(action);

  const preview = items.slice(0, MAX_PREVIEW_ITEMS);

  const handleItemClick = (item: AegisNotification): void => {
    if (!item.read && markRead) {
      void markRead(item.id);
    }
    setOpen(false);
    if (item.to) {
      navigate(item.to);
    }
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
      <div className="aegis-notif-pop__foot">
        <Link
          to={inboxPath}
          className="aegis-notif-pop__view-all"
          onClick={() => {
            setOpen(false);
          }}
        >
          View all
        </Link>
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
      overlayClassName="aegis-notif-pop__overlay"
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

export default NotificationBell;
