import type { ReactElement } from 'react';
import { useNavigate } from 'react-router-dom';

import { Button } from 'antd';

import { ErrorState } from '@OperationsPAI/aegis-ui';

export function NotFound(): ReactElement {
  const navigate = useNavigate();
  return (
    <ErrorState
      code={404}
      title='Page not found'
      description="The page you're looking for doesn't exist, or it was moved."
      action={
        <Button type='primary' onClick={() => navigate('/portal')}>
          Back to dashboard
        </Button>
      }
    />
  );
}

export default NotFound;
