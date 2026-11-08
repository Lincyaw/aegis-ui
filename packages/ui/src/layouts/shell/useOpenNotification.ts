import { useCallback } from 'react';

import { useNavigate } from 'react-router-dom';

import { type AegisNotification, useNotifications } from '../../notifications';

/** Marks an unread notification read, then follows its `to`. */
export function useOpenNotification(): (item: AegisNotification) => void {
  const { markRead } = useNotifications();
  const navigate = useNavigate();
  return useCallback(
    (item: AegisNotification) => {
      if (!item.read && markRead) {
        void markRead(item.id);
      }
      if (item.to) {
        navigate(item.to);
      }
    },
    [markRead, navigate],
  );
}
