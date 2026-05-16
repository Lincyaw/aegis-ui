import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import { Button, Chip, PageHeader, useAppNavigate } from '@lincyaw/aegis-ui';
import { App as AntdApp, Input, Modal } from 'antd';

import { useActiveProjectIdNum, useSubmitInjection } from '../api/injections';
import { LivePreview } from '../components/inject/LivePreview';
import { defaultSpec, isStepValid } from '../components/inject/paramSchema';
import { Step1Target } from '../components/inject/Step1Target';
import { Step2ChaosType } from '../components/inject/Step2ChaosType';
import { Step3Params } from '../components/inject/Step3Params';
import { Step4Lifecycle } from '../components/inject/Step4Lifecycle';
import { Step5Stage } from '../components/inject/Step5Stage';
import { Step6Review } from '../components/inject/Step6Review';
import type { GuidedInjectionSpec } from '../mocks/types';
import { useInjectBatch } from '../state/inject-batch';

const STEPS = [
  'Target',
  'Chaos type',
  'Parameters',
  'Lifecycle',
  'Stage',
  'Review',
];

function draftKey(projectId: number): string {
  return `inject-guided-draft:${projectId}`;
}

export default function InjectionCreate() {
  const pid = useActiveProjectIdNum();
  const [params] = useSearchParams();
  const navigate = useAppNavigate();
  const { message: msg, modal } = AntdApp.useApp();

  const stage = useInjectBatch((s) => s.stage);
  const staged = useInjectBatch((s) => s.staged);
  const clear = useInjectBatch((s) => s.clear);
  const saveTemplate = useInjectBatch((s) => s.saveTemplate);

  const submitMutation = useSubmitInjection();

  const initialSpec = useMemo<GuidedInjectionSpec>(() => {
    const sys = params.get('system') ?? '';
    const chaos = params.get('chaosType') ?? '';
    return {
      ...defaultSpec(sys),
      chaosType: chaos,
    };
  }, [params]);

  const [step, setStep] = useState(0);
  const [spec, setSpec] = useState<GuidedInjectionSpec>(initialSpec);
  const [submitMode, setSubmitMode] = useState<'submit' | 'stage'>('submit');
  const [resumeAsked, setResumeAsked] = useState(false);
  const [templateModalOpen, setTemplateModalOpen] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [templateDesc, setTemplateDesc] = useState('');

  const update = (patch: Partial<GuidedInjectionSpec>): void => {
    setSpec((s) => ({ ...s, ...patch }));
  };

  useEffect(() => {
    sessionStorage.setItem(draftKey(pid), JSON.stringify(spec));
  }, [spec, pid]);

  useEffect(() => {
    if (resumeAsked) {
      return;
    }
    const raw = sessionStorage.getItem(draftKey(pid));
    if (!raw) {
      setResumeAsked(true);
      return;
    }
    try {
      const parsed = JSON.parse(raw) as GuidedInjectionSpec;
      if (parsed.systemCode || parsed.chaosType) {
        modal.confirm({
          title: 'Resume previous draft?',
          content: `A previous fault-injection draft for project ${pid} was found.`,
          okText: 'Resume',
          cancelText: 'Start fresh',
          onOk: () => {
            setSpec(parsed);
          },
          onCancel: () => {
            sessionStorage.removeItem(draftKey(pid));
          },
        });
      }
    } catch {
      // ignore
    }
    setResumeAsked(true);
  }, [modal, pid, resumeAsked]);

  const canNext = isStepValid(step, spec);
  const isLast = step === STEPS.length - 1;

  const reset = (): void => {
    sessionStorage.removeItem(draftKey(pid));
    setSpec(defaultSpec(''));
    setStep(0);
  };

  const submit = (): void => {
    if (submitMode === 'stage') {
      stage(spec);
      void msg.success('Draft added to batch');
      setSpec(defaultSpec(spec.systemCode));
      setStep(0);
      return;
    }
    submitMutation.mutate(
      {
        projectId: pid,
        specs: [spec],
        autoAllocate: spec.namespaceMode !== 'specific',
        allowBootstrap: spec.namespaceMode === 'auto-bootstrap',
        skipRestartPedestal: spec.skipRestartPedestal,
      },
      {
        onSuccess: () => {
          void msg.success('Injection submitted');
          sessionStorage.removeItem(draftKey(pid));
          navigate('injections');
        },
        onError: (err) => {
          void msg.error(`Submit failed: ${err.message}`);
        },
      }
    );
  };

  const submitBatchNow = (): void => {
    if (staged.length === 0) {
      void msg.info('No staged drafts');
      return;
    }
    submitMutation.mutate(
      {
        projectId: pid,
        specs: staged.map((s) => s.spec),
        autoAllocate: true,
      },
      {
        onSuccess: () => {
          void msg.success(
            `${staged.length} injection${staged.length === 1 ? '' : 's'} queued`
          );
          clear();
          navigate('injections');
        },
        onError: (err) => {
          void msg.error(`Batch submit failed: ${err.message}`);
        },
      }
    );
  };

  return (
    <div className='page-wrapper'>
      <PageHeader
        title='New Injection'
        description={`Guided fault-injection wizard for project ${pid}.`}
        action={
          <div className='page-action-row'>
            <Chip tone='ghost'>
              step {step + 1} / {STEPS.length}
            </Chip>
            <Button tone='ghost' onClick={reset}>
              Reset
            </Button>
            <Button tone='secondary' onClick={() => navigate('injections')}>
              Cancel
            </Button>
          </div>
        }
      />

      <div className='wizard-steps-clickable'>
        <ol className='wizard-steps'>
          {STEPS.map((label, idx) => {
            const state =
              idx < step ? 'done' : idx === step ? 'active' : 'todo';
            return (
              <li
                key={label}
                className={`wizard-steps__item wizard-steps__item--${state}`}
              >
                <button
                  type='button'
                  className='wizard-steps__btn'
                  onClick={() => setStep(idx)}
                >
                  <span className='wizard-steps__num'>{idx + 1}</span>
                  <span className='wizard-steps__label'>{label}</span>
                </button>
              </li>
            );
          })}
        </ol>
      </div>

      <div className='inject-layout'>
        <div className='inject-layout__main'>
          {step === 0 && <Step1Target spec={spec} update={update} />}
          {step === 1 && <Step2ChaosType spec={spec} update={update} />}
          {step === 2 && <Step3Params spec={spec} update={update} />}
          {step === 3 && <Step4Lifecycle spec={spec} update={update} />}
          {step === 4 && (
            <Step5Stage mode={submitMode} setMode={setSubmitMode} />
          )}
          {step === 5 && <Step6Review spec={spec} />}
        </div>
        <aside className='inject-layout__side'>
          <LivePreview spec={spec} />
        </aside>
      </div>

      <div className='wizard-actions'>
        {staged.length > 0 && (
          <Button
            tone='secondary'
            onClick={submitBatchNow}
            disabled={submitMutation.isPending}
          >
            Submit batch ({staged.length})
          </Button>
        )}
        <Button
          tone='ghost'
          onClick={() => setStep((s) => Math.max(0, s - 1))}
          disabled={step === 0}
        >
          Back
        </Button>
        {!isLast ? (
          <Button
            tone='primary'
            onClick={() => setStep((s) => s + 1)}
            disabled={!canNext}
          >
            Next
          </Button>
        ) : (
          <>
            <Button tone='ghost' onClick={() => setTemplateModalOpen(true)}>
              Save as template
            </Button>
            <Button
              tone='primary'
              onClick={submit}
              disabled={!canNext || submitMutation.isPending}
            >
              {submitMode === 'stage' ? 'Add to batch' : 'Inject now'}
            </Button>
          </>
        )}
      </div>

      <Modal
        title='Save as template'
        open={templateModalOpen}
        onCancel={() => setTemplateModalOpen(false)}
        onOk={() => {
          if (!templateName.trim()) {
            void msg.error('name is required');
            return;
          }
          saveTemplate(templateName, templateDesc, spec);
          void msg.success(`Template '${templateName}' saved`);
          setTemplateModalOpen(false);
          setTemplateName('');
          setTemplateDesc('');
        }}
        okText='Save'
      >
        <Input
          value={templateName}
          onChange={(e) => setTemplateName(e.target.value)}
          placeholder='template name'
          style={{ marginBottom: 8 }}
        />
        <Input.TextArea
          value={templateDesc}
          onChange={(e) => setTemplateDesc(e.target.value)}
          placeholder='description (optional)'
          rows={3}
        />
      </Modal>
    </div>
  );
}
