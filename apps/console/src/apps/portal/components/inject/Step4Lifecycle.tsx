import {
  BlastRadiusBar,
  Checkbox,
  MetricLabel,
  Panel,
  PanelTitle,
} from '@lincyaw/aegis-ui';
import { Form, Slider } from 'antd';

import {
  CHAOS_BY_NAME,
  type ChaosTypeDef,
  type GuidedInjectionSpec,
} from '../../domain/injectSpec';

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

const BLAST_PERCENT: Record<ChaosTypeDef['blastHint'], number> = {
  pod: 25,
  service: 60,
  namespace: 90,
};

export function Step4Lifecycle({ spec, update }: Props) {
  const def = CHAOS_BY_NAME[spec.chaosType];
  return (
    <Panel
      title={<PanelTitle size='base'>4. Lifecycle &amp; scope</PanelTitle>}
    >
      <Form layout='vertical' component='div'>
        <Form.Item label={`Duration · ${String(spec.durationSec)}s`}>
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
          <div className='page-stack'>
            <BlastRadiusBar value={def ? BLAST_PERCENT[def.blastHint] : 0} />
            <MetricLabel size='xs'>
              {def
                ? `A ${def.name} fault reaches the ${def.blastHint} · pod < service < namespace`
                : 'Pick a chaos type to estimate the reach.'}
            </MetricLabel>
          </div>
        </Form.Item>

        <Form.Item extra='maps to --skip-restart-pedestal.'>
          <Checkbox
            label='Skip restarting the pedestal'
            checked={spec.skipRestartPedestal}
            onChange={(checked) => update({ skipRestartPedestal: checked })}
          />
        </Form.Item>
      </Form>
    </Panel>
  );
}
