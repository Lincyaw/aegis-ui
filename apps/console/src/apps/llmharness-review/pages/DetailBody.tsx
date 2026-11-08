import { type ReactElement } from 'react';

import { EmptyState } from '@lincyaw/aegis-ui';

import type { CaseBundle } from '../schemas';
import { useCaseSelection } from '../selection';

import { EventDetail } from './EventDetail';
import { FindingDetail } from './FindingDetail';
import { TurnDetail } from './TurnDetail';

interface DetailBodyProps {
  bundle: CaseBundle;
}

/** The selected event, finding or turn, shown in the detail modal. */
export function DetailBody({ bundle }: DetailBodyProps): ReactElement {
  const { selection } = useCaseSelection();

  // A graph node or a finding's event chip selects an event without
  // clearing the turn or finding, so the event is checked first.
  if (selection.eventId !== null) {
    return <EventDetail bundle={bundle} eventId={selection.eventId} />;
  }
  if (selection.findingId !== null) {
    return <FindingDetail bundle={bundle} findingId={selection.findingId} />;
  }
  if (selection.turn !== null) {
    return <TurnDetail bundle={bundle} turnIndex={selection.turn} />;
  }
  return (
    <div className='llmh-insp'>
      <EmptyState
        title='Nothing selected'
        description='Pick a firing in the timeline above, or click a graph node / turn.'
      />
    </div>
  );
}
