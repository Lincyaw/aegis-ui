export type ContainerStatus = 'running' | 'stopped' | 'failed';

export interface DemoContainer {
  id: string;
  name: string;
  image: string;
  status: ContainerStatus;
  cpu: number;
  memMb: number;
  createdAt: string;
}

export const seedContainers: DemoContainer[] = [
  {
    id: 'c-001',
    name: 'frontend-edge',
    image: 'opspai/edge:1.4.2',
    status: 'running',
    cpu: 0.32,
    memMb: 412,
    createdAt: '2026-05-09T10:14:00Z',
  },
  {
    id: 'c-002',
    name: 'rca-worker',
    image: 'opspai/rcabench:e2e-kind-20260421',
    status: 'running',
    cpu: 0.81,
    memMb: 1280,
    createdAt: '2026-05-08T22:01:00Z',
  },
  {
    id: 'c-003',
    name: 'otel-collector',
    image: 'otel/opentelemetry-collector:0.103.0',
    status: 'failed',
    cpu: 0,
    memMb: 0,
    createdAt: '2026-05-09T08:42:00Z',
  },
  {
    id: 'c-004',
    name: 'clickhouse-0',
    image: 'clickhouse/clickhouse-server:24.3',
    status: 'running',
    cpu: 0.51,
    memMb: 2048,
    createdAt: '2026-05-05T17:30:00Z',
  },
  {
    id: 'c-005',
    name: 'ts-payment',
    image: 'opspai/train-ticket-payment:latest',
    status: 'stopped',
    cpu: 0,
    memMb: 0,
    createdAt: '2026-05-07T14:08:00Z',
  },
];
