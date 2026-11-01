import {
  type AgentCommandInvocation,
  type AgentContextValue,
  type AgentMessage,
  AgentPanel,
  AgentProvider,
  Avatar,
  ChatComposer,
  ChatMessage,
  ChatMessageList,
  ChatSessionList,
  CommandInvocationCard,
  MetricLabel,
  Panel,
  PanelTitle,
  SectionDivider,
} from '@lincyaw/aegis-ui';

import { GALLERY_NOW } from '../fixtures';
import { Specimen } from '../shared';

const MOCK_INVOCATION_PENDING: AgentCommandInvocation = {
  commandId: 'projects.create',
  args: { name: 'rosetta-lab', team: 'platform' },
  status: 'pending',
};

const MOCK_INVOCATION_SUCCESS: AgentCommandInvocation = {
  commandId: 'experiments.run',
  args: { id: 'exp-7421', dryRun: false },
  status: 'success',
};

const MOCK_INVOCATION_ERROR: AgentCommandInvocation = {
  commandId: 'datasets.delete',
  args: { id: 'ds-9911' },
  status: 'error',
  error: 'permission denied: dataset is referenced by 3 experiments',
};

const MOCK_AGENT_MESSAGES: AgentMessage[] = [
  {
    id: 'm-1',
    role: 'user',
    content: 'Spin up a new project called rosetta-lab.',
    timestamp: new Date(GALLERY_NOW - 4 * 60_000).toISOString(),
  },
  {
    id: 'm-2',
    role: 'assistant',
    content:
      'Creating project rosetta-lab under the platform team. I will confirm once it lands.',
    invocations: [MOCK_INVOCATION_SUCCESS],
    timestamp: new Date(GALLERY_NOW - 3 * 60_000).toISOString(),
  },
  {
    id: 'm-3',
    role: 'system',
    content: 'Session resumed from earlier today.',
    timestamp: new Date(GALLERY_NOW - 2 * 60_000).toISOString(),
  },
  {
    id: 'm-4',
    role: 'user',
    content: 'Also kick off the smoke experiment when it is ready.',
    timestamp: new Date(GALLERY_NOW - 60_000).toISOString(),
  },
];

const MOCK_AGENT_VALUE: AgentContextValue = {
  messages: MOCK_AGENT_MESSAGES,
  sending: false,
  send: () => undefined,
};

export function AgentSection() {
  return (
    <Panel title={<PanelTitle size='lg'>Agent</PanelTitle>}>
      <SectionDivider>ChatMessage</SectionDivider>
      <div className='gallery__row gallery__row--wide'>
        <Specimen caption='user · plain text' span={2}>
          <ChatMessage
            role='user'
            senderName='You'
            avatar={<Avatar name='Alex Park' size='sm' />}
            content='Spin up a new project called rosetta-lab.'
            timestamp='12:04'
          />
        </Specimen>
        <Specimen caption='assistant · plain text' span={2}>
          <ChatMessage
            role='assistant'
            senderName='Aegis Assistant'
            avatar={<Avatar name='Aegis Assistant' size='sm' />}
            content='Creating project rosetta-lab under the platform team.'
            timestamp='12:04'
            surface={{
              id: 'gallery.chat.assistant',
              kind: 'message',
              label: 'Assistant message',
              askSuggestions: ['Summarize this message'],
              project: (data) => ({
                fields: [
                  { name: 'role', type: 'string', value: data.role },
                  {
                    name: 'content',
                    type: 'string',
                    value: String(data.content),
                  },
                ],
              }),
            }}
          />
        </Specimen>
        <Specimen caption='assistant · with command card' span={2}>
          <ChatMessage
            role='assistant'
            senderName='Aegis Assistant'
            avatar={<Avatar name='Aegis Assistant' size='sm' />}
            content='Running the smoke experiment now.'
            timestamp='12:05'
            footer={
              <CommandInvocationCard
                commandId={MOCK_INVOCATION_SUCCESS.commandId}
                args={MOCK_INVOCATION_SUCCESS.args}
                status={MOCK_INVOCATION_SUCCESS.status}
              />
            }
          />
        </Specimen>
      </div>

      <SectionDivider>CommandInvocationCard</SectionDivider>
      <div className='gallery__row gallery__row--wide'>
        <Specimen caption='pending' span={2}>
          <CommandInvocationCard
            commandId={MOCK_INVOCATION_PENDING.commandId}
            args={MOCK_INVOCATION_PENDING.args}
            status={MOCK_INVOCATION_PENDING.status}
            surface={{
              id: 'gallery.cmdinvoke.pending',
              kind: 'panel',
              label: 'Command invocation · pending',
              askSuggestions: ['What is this command doing?'],
              project: (data) => ({
                fields: [
                  {
                    name: 'commandId',
                    type: 'string',
                    value: data.commandId,
                  },
                  {
                    name: 'status',
                    type: 'string',
                    value: String(data.status ?? ''),
                  },
                ],
              }),
            }}
          />
        </Specimen>
        <Specimen caption='success · undo' span={2}>
          <CommandInvocationCard
            commandId={MOCK_INVOCATION_SUCCESS.commandId}
            args={MOCK_INVOCATION_SUCCESS.args}
            status={MOCK_INVOCATION_SUCCESS.status}
            onUndo={() => undefined}
          />
        </Specimen>
        <Specimen caption='error' span={2}>
          <CommandInvocationCard
            commandId={MOCK_INVOCATION_ERROR.commandId}
            args={MOCK_INVOCATION_ERROR.args}
            status={MOCK_INVOCATION_ERROR.status}
            error={MOCK_INVOCATION_ERROR.error}
          />
        </Specimen>
      </div>

      <SectionDivider>ChatComposer</SectionDivider>
      <div className='gallery__row gallery__row--wide'>
        <Specimen caption='idle' span={2}>
          <ChatComposer onSend={() => undefined} />
        </Specimen>
        <Specimen caption='sending' span={2}>
          <ChatComposer onSend={() => undefined} sending />
        </Specimen>
        <Specimen caption='disabled · with reason' span={2}>
          <ChatComposer
            onSend={() => undefined}
            disabledReason='Assistant is offline'
          />
        </Specimen>
      </div>

      <SectionDivider>ChatMessageList</SectionDivider>
      <div className='gallery__row gallery__row--wide'>
        <Specimen caption='multi-role · with footer typing indicator' span={3}>
          <div className='gallery__agent-frame'>
            <ChatMessageList
              autoScroll={false}
              footer={
                <MetricLabel size='xs'>Aegis Assistant is typing…</MetricLabel>
              }
              surface={{
                id: 'gallery.chatlist.demo',
                kind: 'chat',
                label: 'Chat transcript',
                askSuggestions: ['Summarize the conversation'],
                project: (count) => ({
                  fields: [
                    { name: 'messageCount', type: 'number', value: count },
                  ],
                }),
              }}
            >
              <ChatMessage
                role='user'
                senderName='You'
                avatar={<Avatar name='You' size='sm' />}
                content='What changed in the last deploy?'
                timestamp='12:00'
              />
              <ChatMessage
                role='assistant'
                senderName='Aegis Assistant'
                avatar={<Avatar name='Aegis Assistant' size='sm' />}
                content='Three services rolled forward; one rollback queued.'
                timestamp='12:01'
              />
            </ChatMessageList>
          </div>
        </Specimen>
      </div>

      <SectionDivider>ChatSessionList</SectionDivider>
      <div className='gallery__row gallery__row--wide'>
        <Specimen caption='compact · 3 items · second selected' span={2}>
          <div style={{ maxWidth: 280 }}>
            <ChatSessionList
              density='compact'
              items={[
                {
                  id: 'a',
                  title: '本周回归实验',
                  timestamp: Date.now() - 4 * 60_000,
                },
                {
                  id: 'b',
                  title: '关于蓝色的散文',
                  timestamp: Date.now() - 2 * 3600_000,
                  selected: true,
                },
                {
                  id: 'c',
                  title: '新对话',
                  timestamp: Date.now() - 3 * 86400_000,
                },
              ]}
              onSelect={(id) => {
                console.warn('[gallery] select', id);
              }}
              onRename={(id, next) => {
                console.warn('[gallery] rename', id, next);
              }}
              onDelete={(id) => {
                console.warn('[gallery] delete', id);
              }}
            />
          </div>
        </Specimen>
        <Specimen caption='comfortable · long titles · first selected' span={2}>
          <div style={{ maxWidth: 320 }}>
            <ChatSessionList
              density='comfortable'
              items={[
                {
                  id: 'a',
                  title: '调研 RCA 在多租户场景下的告警合并策略',
                  timestamp: Date.now() - 1 * 60_000,
                  selected: true,
                },
                {
                  id: 'b',
                  title: '关于 OpenTelemetry trace 采样率的讨论',
                  timestamp: Date.now() - 30 * 60_000,
                },
                {
                  id: 'c',
                  title: '短标题',
                  timestamp: Date.now() - 25 * 3600_000,
                },
                {
                  id: 'd',
                  title: '故障演练流程重构',
                  timestamp: Date.now() - 35 * 86400_000,
                },
                {
                  id: 'e',
                  title: '历史会话归档',
                  timestamp: Date.now() - 400 * 86400_000,
                },
              ]}
              onSelect={(id) => {
                console.warn('[gallery] select', id);
              }}
              onRename={(id, next) => {
                console.warn('[gallery] rename', id, next);
              }}
              onDelete={(id) => {
                console.warn('[gallery] delete', id);
              }}
            />
          </div>
        </Specimen>
        <Specimen caption='empty state' span={2}>
          <div style={{ maxWidth: 280 }}>
            <ChatSessionList
              items={[]}
              onSelect={() => undefined}
              emptyState={<span>暂无对话</span>}
            />
          </div>
        </Specimen>
      </div>

      <SectionDivider>AgentPanel · full composition</SectionDivider>
      <AgentProvider value={MOCK_AGENT_VALUE}>
        <div className='gallery__agent-frame'>
          <AgentPanel
            title='Aegis Assistant'
            footer={<ChatComposer onSend={() => undefined} sending={false} />}
            surface={{
              id: 'gallery.agentpanel',
              kind: 'panel',
              label: 'Agent panel',
              askSuggestions: ['What is this agent doing?'],
              project: () => ({
                fields: [
                  { name: 'agent', type: 'string', value: 'Aegis Assistant' },
                ],
              }),
            }}
          >
            <ChatMessageList>
              {MOCK_AGENT_MESSAGES.map((m) => (
                <ChatMessage
                  key={m.id}
                  role={m.role}
                  senderName={m.role === 'user' ? 'You' : 'Aegis Assistant'}
                  avatar={
                    m.role === 'system' ? undefined : (
                      <Avatar
                        name={m.role === 'user' ? 'You' : 'Aegis Assistant'}
                        size='sm'
                      />
                    )
                  }
                  content={m.content}
                  footer={m.invocations?.map((inv, i) => (
                    <CommandInvocationCard
                      key={i}
                      commandId={inv.commandId}
                      args={inv.args}
                      status={inv.status}
                      error={inv.error}
                    />
                  ))}
                />
              ))}
            </ChatMessageList>
          </AgentPanel>
        </div>
      </AgentProvider>
    </Panel>
  );
}
