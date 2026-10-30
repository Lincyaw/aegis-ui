/**
 * View for the root agent / sub-agent (anything that is NOT an
 * extractor or auditor). Just the chat transcript; reminders appear
 * inline as purple chips.
 */

import { type ReactElement } from 'react';

import { ChatTranscript } from '../components/ChatTranscript';
import { useSessionTimeline } from '../store/useInspectStream';

interface Props {
  sessionId: string;
}

export function MainAgentView({ sessionId }: Props): ReactElement {
  const items = useSessionTimeline(sessionId);
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <ChatTranscript items={items} />
    </div>
  );
}
