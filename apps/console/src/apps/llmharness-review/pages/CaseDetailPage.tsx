import { type ReactElement } from 'react';
import { Link, useParams } from 'react-router-dom';

import { EmptyState, Panel, PanelTitle } from '@lincyaw/aegis-ui';

export function CaseDetailPage(): ReactElement {
  const params = useParams<{ caseId: string }>();
  const caseId = params.caseId ? decodeURIComponent(params.caseId) : '';
  return (
    <Panel
      title={
        <PanelTitle size='lg'>
          <Link to='..' style={{ color: 'inherit', textDecoration: 'none' }}>
            ← Cases
          </Link>
        </PanelTitle>
      }
    >
      <EmptyState title='Loading…' description={caseId} />
    </Panel>
  );
}

export default CaseDetailPage;
