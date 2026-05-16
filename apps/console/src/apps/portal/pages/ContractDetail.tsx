import { useParams } from 'react-router-dom';

import {
  Button,
  CodeBlock,
  EmptyState,
  KeyValueList,
  MetricCard,
  MonoValue,
  PageHeader,
  Panel,
  PanelTitle,
  SectionDivider,
  useAppNavigate,
} from '@lincyaw/aegis-ui';

// TODO(portal-wire): no ContractsApi in @lincyaw/portal 1.3.0/1.4.0 — chaos contract specs are fixture-only; stays on mocks.
import { useMockStore } from '../mocks';

export default function ContractDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useAppNavigate();
  const contract = useMockStore((s) => s.contracts.find((c) => c.id === id));
  const injections = useMockStore((s) =>
    s.injections.filter((i) => i.contractId === id),
  );

  const contractToChaosType: Record<string, string> = {
    'pod-kill': 'PodKill',
    'pod-failure': 'PodFailure',
    'container-kill': 'ContainerKill',
    'network-delay': 'NetworkDelay',
    'network-loss': 'NetworkLoss',
    'network-corrupt': 'NetworkCorrupt',
    'network-partition': 'NetworkPartition',
    'dns-error': 'DNSError',
    'dns-delay': 'DNSError',
    'http-abort': 'HTTPRequestAbort',
    'http-500': 'HTTPResponseReplaceCode',
    'http-delay': 'HTTPResponseDelay',
    'jvm-cpu-burn': 'JVMCPUStress',
    'jvm-mem-pressure': 'JVMMemoryStress',
    'jvm-throw': 'JVMException',
    'jvm-gc-pressure': 'JVMGarbageCollector',
    'stress-cpu': 'CPUStress',
    'stress-memory': 'MemoryStress',
    'stress-io': 'CPUStress',
    'time-shift': 'TimeSkew',
  };

  if (!contract) {
    return (
      <div className='page-wrapper'>
        <PageHeader title='Contract not found' />
        <Panel>
          <EmptyState title='Not found' description='No such contract.' />
        </Panel>
      </div>
    );
  }

  return (
    <div className='page-wrapper'>
      <PageHeader
        title={`Contract ${contract.name}`}
        description={contract.description}
        action={
          <Button
            tone='primary'
            onClick={() => {
              const chaosType = contractToChaosType[contract.name] ?? '';
              const qs = new URLSearchParams({ contract: contract.id });
              if (chaosType) qs.set('chaosType', chaosType);
              navigate(`injections/new?${qs.toString()}`);
            }}
          >
            Use contract
          </Button>
        }
      />

      <div className='page-overview-grid'>
        <MetricCard label='Times used' value={injections.length} />
        <MetricCard label='Fault type' value={contract.faultType} />
        <MetricCard label='Target kind' value={contract.targetKind} />
        <MetricCard label='Params' value={contract.paramCount} />
      </div>

      <Panel title={<PanelTitle size='base'>Spec</PanelTitle>}>
        <CodeBlock language='json' code={contract.spec} />
      </Panel>

      <SectionDivider>Sample of injections using this contract</SectionDivider>
      <Panel>
        <KeyValueList
          items={injections.slice(0, 8).map((i) => ({
            k: <MonoValue size='sm'>{i.id}</MonoValue>,
            v: `${i.systemCode} · ${i.status}`,
          }))}
        />
      </Panel>
    </div>
  );
}
