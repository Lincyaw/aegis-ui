import type { ReactElement } from 'react';
import { useNavigate } from 'react-router-dom';

import { Button } from 'antd';

import { ErrorState } from '@OperationsPAI/aegis-ui';

export function Forbidden(): ReactElement {
  const navigate = useNavigate();
  return (
    <ErrorState
      code={403}
      title='Access denied'
      description="You don't have permission to view this page. Contact a workspace admin if you think this is a mistake."
      action={
        <Button type='primary' onClick={() => navigate('/portal')}>
          Back to dashboard
        </Button>
      }
    />
  );
}

export default Forbidden;
