import type { ReactElement, ReactNode } from 'react';

import { Dialog } from '@lincyaw/aegis-ui';

interface DetailModalProps {
  title: ReactNode;
  open: boolean;
  onClose: () => void;
  children: ReactNode;
}

/** The scrolling dialog every case-detail drill-down opens in. */
export function DetailModal({
  title,
  open,
  onClose,
  children,
}: DetailModalProps): ReactElement {
  return (
    <Dialog title={title} open={open} onClose={onClose} width='lg'>
      {children}
    </Dialog>
  );
}
