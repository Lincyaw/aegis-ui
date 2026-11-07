import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import {
  Button,
  Dialog,
  PageHeader,
  Steps,
  TextField,
  useAppNavigate,
} from '@lincyaw/aegis-ui';
import { App as AntdApp } from 'antd';

import { errMsg } from '../../../api/apiClient';
import { useSubmitInjection } from '../api/injections';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { LivePreview } from '../components/inject/LivePreview';
import { Step1Target } from '../components/inject/Step1Target';
import { Step2ChaosType } from '../components/inject/Step2ChaosType';
import { Step3Params } from '../components/inject/Step3Params';
import { Step4Lifecycle } from '../components/inject/Step4Lifecycle';
import { Step5Stage, type SubmitMode } from '../components/inject/Step5Stage';
import { Step6Review } from '../components/inject/Step6Review';
import { ProjectRequired } from '../components/ProjectRequired';
import {
  BATCH_SUBMIT_OPTIONS,
  defaultSpec,
  firstInvalidStep,
  type GuidedInjectionSpec,
  isStepValid,
  submitOptionsFor,
  toSubmitRequest,
  withChaosType,
  WIZARD_STEPS,
} from '../domain/injectSpec';
import { useActiveProject } from '../hooks/useActiveProject';
import { useInjectBatch } from '../state/inject-batch';
import { clearDraft, readDraft, saveDraft } from '../state/inject-draft';

function specFromLink(params: URLSearchParams): GuidedInjectionSpec {
  const spec = defaultSpec(params.get('system') ?? '');
  const chaosType = params.get('chaosType');
  return chaosType ? withChaosType(spec, chaosType) : spec;
}

interface WizardProps {
  projectId: number;
  projectName: string;
}

function InjectionWizard({ projectId, projectName }: WizardProps) {
  const [params] = useSearchParams();
  const navigate = useAppNavigate();
  const { message: msg } = AntdApp.useApp();

  const stage = useInjectBatch((s) => s.stage);
  const staged = useInjectBatch((s) => s.staged);
  const clear = useInjectBatch((s) => s.clear);
  const saveTemplate = useInjectBatch((s) => s.saveTemplate);
  const submitMutation = useSubmitInjection();

  const [draft, setDraft] = useState(() => readDraft(projectId));
  const [spec, setSpec] = useState(() => specFromLink(params));
  const [step, setStep] = useState(0);
  const [submitMode, setSubmitMode] = useState<SubmitMode>('submit');
  const [templateOpen, setTemplateOpen] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [templateDesc, setTemplateDesc] = useState('');
  const [templateError, setTemplateError] = useState<string>();

  useEffect(() => {
    if (draft === null) {
      saveDraft(projectId, spec);
    }
  }, [draft, projectId, spec]);

  const update = (patch: Partial<GuidedInjectionSpec>): void => {
    setSpec((s) => ({ ...s, ...patch }));
  };

  const reachable = firstInvalidStep(spec);
  const isLast = step === WIZARD_STEPS.length - 1;

  const reset = (): void => {
    clearDraft(projectId);
    setSpec(defaultSpec());
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
        projectId,
        request: toSubmitRequest([spec], submitOptionsFor(spec)),
      },
      {
        onSuccess: () => {
          void msg.success('Injection submitted');
          clearDraft(projectId);
          navigate('injections');
        },
        onError: (err) => {
          void msg.error(`Submit failed: ${errMsg(err)}`);
        },
      }
    );
  };

  const submitBatch = (): void => {
    submitMutation.mutate(
      {
        projectId,
        request: toSubmitRequest(
          staged.map((s) => s.spec),
          BATCH_SUBMIT_OPTIONS
        ),
      },
      {
        onSuccess: () => {
          void msg.success(
            `${String(staged.length)} injection${staged.length === 1 ? '' : 's'} queued`
          );
          clear();
          navigate('injections');
        },
        onError: (err) => {
          void msg.error(`Batch submit failed: ${errMsg(err)}`);
        },
      }
    );
  };

  const closeTemplate = (): void => {
    setTemplateOpen(false);
    setTemplateName('');
    setTemplateDesc('');
    setTemplateError(undefined);
  };

  const confirmTemplate = (): void => {
    const name = templateName.trim();
    if (name === '') {
      setTemplateError('Name is required');
      return;
    }
    saveTemplate(name, templateDesc.trim(), spec);
    void msg.success(`Template '${name}' saved`);
    closeTemplate();
  };

  return (
    <>
      <PageHeader
        title='New injection'
        description={`Guided fault-injection wizard for ${projectName}.`}
        action={
          <div className='page-action-row'>
            <Button tone='ghost' onClick={reset}>
              Reset
            </Button>
            <Button tone='secondary' onClick={() => navigate('injections')}>
              Cancel
            </Button>
          </div>
        }
      />

      <Steps
        ariaLabel='Injection steps'
        current={step}
        onStepClick={setStep}
        items={WIZARD_STEPS.map((label, index) => ({
          key: label,
          label,
          disabled: index > reachable,
        }))}
      />

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
            onClick={submitBatch}
            disabled={submitMutation.isPending}
          >
            {`Submit batch (${String(staged.length)})`}
          </Button>
        )}
        <Button
          tone='ghost'
          onClick={() => setStep((s) => Math.max(0, s - 1))}
          disabled={step === 0}
        >
          Back
        </Button>
        {isLast ? (
          <>
            <Button tone='ghost' onClick={() => setTemplateOpen(true)}>
              Save as template
            </Button>
            <Button
              tone='primary'
              onClick={submit}
              disabled={
                reachable < WIZARD_STEPS.length || submitMutation.isPending
              }
            >
              {submitMode === 'stage' ? 'Add to batch' : 'Inject now'}
            </Button>
          </>
        ) : (
          <Button
            tone='primary'
            onClick={() => setStep((s) => s + 1)}
            disabled={!isStepValid(step, spec)}
          >
            Next
          </Button>
        )}
      </div>

      <ConfirmDialog
        open={draft !== null}
        title='Resume the previous draft?'
        description={
          draft === null
            ? undefined
            : `A draft for ${projectName} from earlier in this tab: ${draft.chaosType || 'no fault chosen'} on ${draft.systemCode || 'no system chosen'}. Starting fresh discards it.`
        }
        confirmLabel='Resume'
        cancelLabel='Start fresh'
        onConfirm={() => {
          if (draft !== null) {
            setSpec(draft);
          }
          setDraft(null);
        }}
        onCancel={() => {
          clearDraft(projectId);
          setDraft(null);
        }}
      />

      <Dialog
        open={templateOpen}
        title='Save as template'
        description='Templates last until the page is reloaded.'
        width='sm'
        onClose={closeTemplate}
        footer={
          <>
            <Button tone='secondary' onClick={closeTemplate}>
              Cancel
            </Button>
            <Button tone='primary' onClick={confirmTemplate}>
              Save
            </Button>
          </>
        }
      >
        <div className='page-stack'>
          <TextField
            label='Name'
            value={templateName}
            error={templateError}
            onChange={(e) => {
              setTemplateName(e.target.value);
              setTemplateError(undefined);
            }}
          />
          <TextField
            label='Description (optional)'
            value={templateDesc}
            onChange={(e) => setTemplateDesc(e.target.value)}
          />
        </div>
      </Dialog>
    </>
  );
}

export default function InjectionCreate() {
  const active = useActiveProject();
  if (active.projectId === undefined) {
    return (
      <>
        <PageHeader
          title='New injection'
          description='Guided fault-injection wizard.'
        />
        <ProjectRequired active={active} />
      </>
    );
  }
  return (
    <InjectionWizard
      key={active.projectId}
      projectId={active.projectId}
      projectName={
        active.project?.name ?? `project ${String(active.projectId)}`
      }
    />
  );
}
