import { type ReactElement, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import {
  ErrorState,
  Panel,
  PanelTitle,
  ResizableSidePanel,
  SkeletonText,
} from '@lincyaw/aegis-ui';
import { useQuery } from '@tanstack/react-query';

import { errMsg } from '../../../api/apiClient';
import { CaseSelectionProvider } from '../CaseSelection';
import { CaseMetaBar } from '../components';
import { llmhKeys } from '../queryKeys';
import { type CaseRepo, resolveCaseRepo } from '../repo';
import type { CaseBundle } from '../schemas';
import { useCaseSelection } from '../selection';

import { DetailBody } from './DetailBody';
import { DetailModal } from './DetailModal';
import { type DetailModalApi, DetailModalContext } from './detailModalContext';
import { FiringsTimeline } from './FiringsTimeline';
import { GraphViewport } from './GraphViewport';
import { SftSection } from './SftSection';
import { TurnRail } from './TurnRail';
import { TurnsListModal } from './TurnsListModal';

import './CaseDetailPage.css';

interface LoadedCase {
  repo: CaseRepo;
  caseId: string;
  bundle: CaseBundle;
}

async function loadCase(caseId: string): Promise<LoadedCase> {
  const repo = await resolveCaseRepo();
  if (!repo) {
    throw new Error(
      'No backend connected. Configure a `llmharness serve` URL, a blob root (bucket + prefix), or open a local cases root from the Cases list first.'
    );
  }
  return { repo, caseId, bundle: await repo.loadBundle(caseId) };
}

function CaseDetailBody({ data }: { data: LoadedCase }): ReactElement {
  const { selection, set } = useCaseSelection();
  const [detailOpen, setDetailOpen] = useState(false);
  const [turnsList, setTurnsList] = useState<number[] | null>(null);

  // Default to the first extractor firing on first paint so the viewport
  // is never empty.
  useEffect(() => {
    if (selection.mode !== null) {
      return;
    }
    const first = data.bundle.extractor[0];
    if (first) {
      set({
        mode: 'extractor',
        extractorSeq: first.sequence,
      });
    } else {
      const firstAud = data.bundle.auditor[0];
      if (firstAud) {
        set({ mode: 'auditor', auditorSeq: firstAud.sequence });
      }
    }
    // We want this exactly once per case load. Deps would re-fire on
    // every selection change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.caseId]);

  const detailApi = useMemo<DetailModalApi>(
    () => ({
      openDetail: () => {
        setDetailOpen(true);
      },
      openTurnsList: (turns: number[]) => {
        setTurnsList(turns);
      },
    }),
    []
  );

  const modalTitle = useMemo(() => {
    if (selection.eventId !== null) {
      return `Event #${selection.eventId.toString()}`;
    }
    if (selection.findingId !== null) {
      return `Finding A#${selection.findingId.auditorSeq.toString()} · F#${selection.findingId.index.toString()}`;
    }
    if (selection.turn !== null) {
      return `Turn #${selection.turn.toString()}`;
    }
    return 'Detail';
  }, [selection]);

  return (
    <DetailModalContext.Provider value={detailApi}>
      <div className='llmh-cdp'>
        <FiringsTimeline bundle={data.bundle} />
        <div className='llmh-cdp__layout'>
          <ResizableSidePanel
            side='left'
            defaultWidth={220}
            minWidth={160}
            maxWidth={480}
            collapsible
            stackOnMobile
            persistKey='llmh-cdp-turn-w'
          >
            <TurnRail bundle={data.bundle} />
          </ResizableSidePanel>
          <GraphViewport bundle={data.bundle} />
        </div>
        <SftSection
          repo={data.repo}
          caseId={data.caseId}
          rootSessionId={data.bundle.meta.root_session_id}
        />
      </div>
      <DetailModal
        title={modalTitle}
        open={detailOpen}
        onClose={() => {
          setDetailOpen(false);
        }}
      >
        <DetailBody bundle={data.bundle} />
      </DetailModal>
      <TurnsListModal
        open={turnsList !== null}
        turns={turnsList ?? []}
        bundle={data.bundle}
        onClose={() => {
          setTurnsList(null);
        }}
      />
    </DetailModalContext.Provider>
  );
}

export function CaseDetailPage(): ReactElement {
  const params = useParams<{ caseId: string }>();
  const caseId = params.caseId ? decodeURIComponent(params.caseId) : '';

  const load = useQuery({
    queryKey: llmhKeys.caseBundle(caseId),
    queryFn: () => loadCase(caseId),
    gcTime: 0,
    retry: false,
  });
  const data = load.data;

  const header = (
    <PanelTitle size='lg'>
      <Link to='..' className='llmh-cdp__back'>
        ← Cases
      </Link>
    </PanelTitle>
  );

  if (load.isError) {
    return (
      <Panel title={header}>
        <ErrorState
          title='Failed to load case'
          description={errMsg(load.error)}
        />
      </Panel>
    );
  }
  if (!data) {
    return (
      <Panel title={header}>
        <SkeletonText lines={6} />
      </Panel>
    );
  }

  return (
    <Panel title={header} extra={<CaseMetaBar meta={data.bundle.meta} />}>
      <CaseSelectionProvider>
        <CaseDetailBody data={data} />
      </CaseSelectionProvider>
    </Panel>
  );
}

export default CaseDetailPage;
