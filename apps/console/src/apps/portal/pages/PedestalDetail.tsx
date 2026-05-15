import { Link, useParams } from 'react-router-dom';

import {
  Button,
  Chip,
  CodeBlock,
  DangerZone,
  KeyValueList,
  PageHeader,
  Panel,
  PanelTitle,
  SectionDivider,
  useAppHref,
} from '@lincyaw/aegis-ui';

const VALUES_YAML = `image:
  repository: pair-cn-shanghai.cr.volces.com/opspai/ts
  tag: v1.4.2
otel:
  endpoint: http://otel-collector:4317
resources:
  limits:
    cpu: 2
    memory: 4Gi
`;

export default function PedestalDetail() {
  const { id } = useParams<{ id: string }>();
  const href = useAppHref();
  return (
    <div className='page-wrapper'>
      <PageHeader
        title={`Pedestal ${id ?? ''}`}
        description='Helm release + applied overrides + lifecycle actions.'
        action={
          <>
            <Button tone='secondary'>Restart</Button>{' '}
            <Button tone='secondary'>Apply overrides</Button>
          </>
        }
      />

      <Panel title={<PanelTitle size='base'>Summary</PanelTitle>}>
        <KeyValueList
          items={[
            { k: 'system', v: <Link to={href('systems/ts')}>ts</Link> },
            { k: 'namespace', v: 'ts-1' },
            { k: 'version', v: 'v1.4.2' },
            { k: 'status', v: <Chip tone='ink'>Running</Chip> },
            { k: 'age', v: '3d' },
          ]}
        />
      </Panel>

      <SectionDivider>Helm values</SectionDivider>
      <Panel>
        <CodeBlock language='yaml' code={VALUES_YAML} />
      </Panel>

      <DangerZone title='Danger zone' description='Uninstall removes all release resources from the cluster.'>
        <Button tone='secondary'>Uninstall</Button>
      </DangerZone>
    </div>
  );
}
