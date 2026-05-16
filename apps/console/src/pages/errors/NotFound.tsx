import type { ReactElement } from 'react';
import { useNavigate } from 'react-router-dom';

import { ErrorState } from '@lincyaw/aegis-ui';
import { Button } from 'antd';

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
