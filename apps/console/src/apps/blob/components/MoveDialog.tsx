import { type ReactElement, useState } from 'react';

import { Dialog } from '@lincyaw/aegis-ui';
import { Button, Input } from 'antd';

interface MoveDialogProps {
  open: boolean;
  bucket: string;
  /** Moves the selection; resolves false when the target was rejected. */
  onMove: (target: string) => Promise<boolean>;
  onClose: () => void;
}

export function MoveDialog({
  open,
  bucket,
  onMove,
  onClose,
}: MoveDialogProps): ReactElement {
  const [target, setTarget] = useState('');
  const [busy, setBusy] = useState(false);

  const close = (): void => {
    setTarget('');
    onClose();
  };
  const submit = async (): Promise<void> => {
    setBusy(true);
    const moved = await onMove(target);
    setBusy(false);
    if (moved) {
      close();
    }
  };

  return (
    <Dialog
      open={open}
      title={`Move within "${bucket}"`}
      description='Server-side copy then delete within this bucket — no client bandwidth round-trip. Cross-bucket move is not yet supported.'
      width='sm'
      onClose={close}
      footer={
        <>
          <Button onClick={close}>Cancel</Button>
          <Button
            type='primary'
            loading={busy}
            disabled={target === ''}
            onClick={() => {
              void submit();
            }}
          >
            Move
          </Button>
        </>
      }
    >
      <Input
        aria-label='Target prefix'
        placeholder='target/prefix/'
        value={target}
        onChange={(e) => {
          setTarget(e.target.value);
        }}
        onPressEnter={() => {
          void submit();
        }}
      />
    </Dialog>
  );
}
