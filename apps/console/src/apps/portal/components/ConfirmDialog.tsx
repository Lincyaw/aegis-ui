import { type ReactNode, useState } from 'react';

import { Button, Dialog, TextField } from '@lincyaw/aegis-ui';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description?: ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  /** Disables both buttons while the confirmed action runs. */
  pending?: boolean;
  /** The confirm button stays disabled until this exact text is typed. */
  typedConfirmation?: string;
  onConfirm: () => void;
  /** The cancel button, the close button and Escape. */
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel = 'Cancel',
  pending = false,
  typedConfirmation,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const [typed, setTyped] = useState('');
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    setTyped('');
  }
  const confirmed =
    typedConfirmation === undefined || typed === typedConfirmation;
  const cancel = (): void => {
    if (!pending) {
      onCancel();
    }
  };
  return (
    <Dialog
      open={open}
      title={title}
      description={description}
      width='sm'
      onClose={cancel}
      footer={
        <>
          <Button tone='secondary' disabled={pending} onClick={cancel}>
            {cancelLabel}
          </Button>
          <Button
            tone='primary'
            disabled={pending || !confirmed}
            onClick={onConfirm}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      {typedConfirmation !== undefined && (
        <TextField
          label={`Type ${typedConfirmation} to confirm`}
          value={typed}
          autoComplete='off'
          onChange={(e) => setTyped(e.target.value)}
        />
      )}
    </Dialog>
  );
}
