import { Form, Slider, Switch } from 'antd';

import { BlastRadiusBar, MetricLabel, Panel, PanelTitle } from '@lincyaw/aegis-ui';

import type { GuidedInjectionSpec } from '../../mocks/types';
import { CHAOS_BY_NAME } from './paramSchema';

interface Props {
  spec: GuidedInjectionSpec;
  update: (patch: Partial<GuidedInjectionSpec>) => void;
}

const DURATION_MARKS = {
  30: '30s',
  60: '1m',
  300: '5m',
  900: '15m',
  1800: '30m',
};

function blastFor(spec: GuidedInjectionSpec): number {
  const def = CHAOS_BY_NAME[spec.chaosType];
  if (!def) return 30;
  if (def.blastHint === 'pod') return 25;
  if (def.blastHint === 'service') return 60;
  return 90;
}

export function Step4Lifecycle({ spec, update }: Props) {
  return (
    <Panel title={<PanelTitle size='base'>4. Lifecycle &amp; scope</PanelTitle>}>
      <Form layout='vertical'>
        <Form.Item label={`Duration · ${spec.durationSec}s`}>
          <Slider
            min={15}
            max={1800}
            step={15}
            marks={DURATION_MARKS}
            value={spec.durationSec}
            onChange={(v: number) => update({ durationSec: v })}
          />
        </Form.Item>

        <Form.Item label='Estimated blast radius'>
          <BlastRadiusBar value={blastFor(spec)} />
          <MetricLabel size='xs'>
            heuristic from chaos type · pod &lt; service &lt; namespace
          </MetricLabel>
        </Form.Item>

        <Form.Item
          label='Skip restart pedestal'
          extra='maps to --skip-restart-pedestal.'
        >
          <Switch
            checked={spec.skipRestartPedestal}
            onChange={(v) => update({ skipRestartPedestal: v })}
          />
        </Form.Item>

        <Form.Item
          label='Skip stale-check'
          extra='maps to --skip-stale-check; bypasses duplicate-suppression.'
        >
          <Switch
            checked={spec.skipStaleCheck}
            onChange={(v) => update({ skipStaleCheck: v })}
          />
        </Form.Item>
      </Form>
    </Panel>
  );
}
