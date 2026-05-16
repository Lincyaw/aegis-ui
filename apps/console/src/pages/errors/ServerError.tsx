import type { ReactElement } from 'react';

import { ErrorState } from '@lincyaw/aegis-ui';
import { Button } from 'antd';

export function ServerError(): ReactElement {
  return (
    <ErrorState
      code={500}
      title='Something went wrong'
      description='An unexpected error occurred on our side. Try again in a few moments, or contact support if the problem persists.'
      action={
        <Button type='primary' onClick={() => window.location.reload()}>
          Reload page
        </Button>
      }
    />
  );
}

export default ServerError;
