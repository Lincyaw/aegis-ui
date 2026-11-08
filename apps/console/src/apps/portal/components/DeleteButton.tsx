import { useState } from 'react';

import { Button } from '@lincyaw/aegis-ui';
import { App as AntdApp } from 'antd';

import { errMsg } from '../../../api/apiClient';

import { ConfirmDialog } from './ConfirmDialog';

interface DeleteButtonProps {
  /** What is deleted, e.g. `dataset ts-replay`. */
  subject: string;
  /** Runs the deletion; a rejection is reported and keeps the dialog open. */
  onDelete: () => Promise<unknown>;
  label?: string;
  tone?: 'secondary' | 'ghost';
  disabled?: boolean;
  /** Extra consequence shown in the dialog. */
  consequence?: string;
  /** The text to type before the delete is allowed, for the most destructive actions. */
  typedConfirmation?: string;
}

/** Every delete in the portal goes through this: a button, then a confirming dialog. */
export function DeleteButton({
  subject,
  onDelete,
  label = 'Delete',
  tone = 'secondary',
  disabled = false,
  consequence,
  typedConfirmation,
}: DeleteButtonProps) {
  const { message: msg } = AntdApp.useApp();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);

  const confirm = async (): Promise<void> => {
    setPending(true);
    try {
      await onDelete();
      setOpen(false);
    } catch (err) {
      void msg.error(`${label} failed: ${errMsg(err)}`);
    } finally {
      setPending(false);
    }
  };

  return (
    <>
      <Button tone={tone} disabled={disabled} onClick={() => setOpen(true)}>
        {label}
      </Button>
      <ConfirmDialog
        open={open}
        title={`${label} ${subject}?`}
        description={consequence ?? 'This cannot be undone.'}
        confirmLabel={label}
        pending={pending}
        typedConfirmation={typedConfirmation}
        onConfirm={() => {
          void confirm();
        }}
        onCancel={() => setOpen(false)}
      />
    </>
  );
}
