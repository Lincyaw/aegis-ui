import type { ReactElement, ReactNode } from 'react';

import { Modal } from 'antd';

interface DetailModalProps {
  title: ReactNode;
  open: boolean;
  onClose: () => void;
  children: ReactNode;
}

/** The scrolling modal every case-detail drill-down opens in. */
export function DetailModal({
  title,
  open,
  onClose,
  children,
}: DetailModalProps): ReactElement {
  return (
    <Modal
      title={title}
      open={open}
      onCancel={onClose}
      footer={null}
      width={720}
      destroyOnClose
      rootClassName='llmh-detail-modal'
    >
      {children}
    </Modal>
  );
}
