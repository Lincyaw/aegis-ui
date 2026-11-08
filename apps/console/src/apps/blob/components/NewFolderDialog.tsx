import { type ReactElement, useState } from 'react';

import { Dialog } from '@lincyaw/aegis-ui';
import { Button, Input } from 'antd';

interface NewFolderDialogProps {
  open: boolean;
  /** Creates the folder; resolves false when it failed and the dialog stays. */
  onCreate: (name: string) => Promise<boolean>;
  onClose: () => void;
}

export function NewFolderDialog({
  open,
  onCreate,
  onClose,
}: NewFolderDialogProps): ReactElement {
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);

  const close = (): void => {
    setName('');
    onClose();
  };
  const submit = async (): Promise<void> => {
    const trimmed = name.trim();
    if (!trimmed) {
      return;
    }
    setBusy(true);
    const created = await onCreate(trimmed);
    setBusy(false);
    if (created) {
      close();
    }
  };

  return (
    <Dialog
      open={open}
      title='New folder'
      width='sm'
      onClose={close}
      footer={
        <>
          <Button onClick={close}>Cancel</Button>
          <Button
            type='primary'
            loading={busy}
            disabled={name.trim() === ''}
            onClick={() => {
              void submit();
            }}
          >
            Create
          </Button>
        </>
      }
    >
      <Input
        aria-label='Folder name'
        placeholder='folder-name'
        value={name}
        onChange={(e) => {
          setName(e.target.value);
        }}
        onPressEnter={() => {
          void submit();
        }}
      />
    </Dialog>
  );
}
