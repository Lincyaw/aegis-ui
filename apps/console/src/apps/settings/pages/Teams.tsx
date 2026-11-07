import { useState } from 'react';

import {
  Avatar,
  Chip,
  EmptyState,
  ErrorState,
  MetricLabel,
  PageHeader,
  Panel,
  PanelTitle,
} from '@lincyaw/aegis-ui';
import type { TeamTeamResp } from '@lincyaw/portal';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { App, Button, Form, Input, Modal, Spin } from 'antd';

import { errMsg } from '../../../api/apiClient';
import { teamsApi } from '../../portal/api/portal-client';
import { settingsKeys } from '../queryKeys';
import '../settings.css';

import './Teams.css';

const MAX_VISIBLE = 5;

interface CreateForm {
  name: string;
  description: string;
}

async function readTeamMembers(teamId: number) {
  const res = await teamsApi.listTeamMembers({ teamId, page: 1, size: 10 });
  const data = res.data.data;
  return {
    members: data?.items ?? [],
    total: data?.pagination?.total ?? data?.items?.length ?? 0,
  };
}

async function readTeams(): Promise<TeamTeamResp[]> {
  const res = await teamsApi.listTeams({ page: 1, size: 50 });
  return res.data.data?.items ?? [];
}

function MembersStrip({ teamId }: { teamId: number }) {
  const membersQuery = useQuery({
    queryKey: settingsKeys.teamMembers(teamId),
    queryFn: () => readTeamMembers(teamId),
  });

  if (membersQuery.isPending) {
    return <Spin size='small' />;
  }
  if (membersQuery.isError) {
    return (
      <MetricLabel>
        Could not load members: {errMsg(membersQuery.error)}
      </MetricLabel>
    );
  }
  const { members, total } = membersQuery.data;
  if (members.length === 0) {
    return <MetricLabel>No members yet</MetricLabel>;
  }
  const visible = members.slice(0, MAX_VISIBLE);
  const overflow = total - visible.length;
  return (
    <div className='teams-page__avatars'>
      {visible.map((m) => (
        <span key={m.user_id} className='teams-page__avatar'>
          <Avatar name={m.full_name || m.username || '?'} size='sm' />
        </span>
      ))}
      {overflow > 0 && <Chip tone='ghost'>+{overflow} more</Chip>}
    </div>
  );
}

export default function Teams() {
  const { message: msg, modal } = App.useApp();
  const queryClient = useQueryClient();
  const teamsQuery = useQuery({
    queryKey: settingsKeys.teams,
    queryFn: readTeams,
  });
  const teams = teamsQuery.data ?? [];
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm] = Form.useForm<CreateForm>();
  const [submitting, setSubmitting] = useState(false);

  const refresh = (): Promise<void> =>
    queryClient.invalidateQueries({ queryKey: settingsKeys.teams });

  const handleCreate = (): void => {
    createForm
      .validateFields()
      .then(async (values) => {
        setSubmitting(true);
        try {
          await teamsApi.createTeam({
            teamCreateTeamReq: {
              name: values.name.trim(),
              description: values.description.trim() || undefined,
            },
          });
          void msg.success('Team created');
          setCreateOpen(false);
          createForm.resetFields();
          await refresh();
        } catch (e) {
          void msg.error(`Create failed: ${errMsg(e)}`);
        } finally {
          setSubmitting(false);
        }
      })
      .catch(() => {
        /* validation handled inline */
      });
  };

  const handleDelete = (team: TeamTeamResp): void => {
    if (team.id === undefined) {
      return;
    }
    const id = team.id;
    modal.confirm({
      title: `Delete team "${team.name ?? ''}"?`,
      content: 'Members lose this team grouping. This cannot be undone.',
      okText: 'Delete',
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await teamsApi.deleteTeam({ teamId: id });
          void msg.success('Team deleted');
          await refresh();
        } catch (e) {
          void msg.error(`Delete failed: ${errMsg(e)}`);
        }
      },
    });
  };

  return (
    <>
      <PageHeader
        title='Teams'
        description='Group members into teams for easier access control.'
        action={
          <Button
            type='primary'
            onClick={() => {
              setCreateOpen(true);
            }}
          >
            + Create team
          </Button>
        }
      />
      {teamsQuery.isError ? (
        <Panel>
          <ErrorState
            title='Could not load teams'
            description={errMsg(teamsQuery.error)}
            action={
              <Button
                onClick={() => {
                  void teamsQuery.refetch();
                }}
              >
                Try again
              </Button>
            }
          />
        </Panel>
      ) : teamsQuery.isPending ? (
        <Panel>
          <div className='settings-page__loading'>
            <Spin />
          </div>
        </Panel>
      ) : teams.length === 0 ? (
        <Panel>
          <EmptyState
            title='No teams yet'
            description='Create a team to group members for access control.'
            action={
              <Button
                type='primary'
                onClick={() => {
                  setCreateOpen(true);
                }}
              >
                + Create team
              </Button>
            }
          />
        </Panel>
      ) : (
        <div className='teams-page__list'>
          {teams.map((team) => (
            <Panel key={team.id}>
              <div className='teams-page__card'>
                <div className='teams-page__head'>
                  <div className='teams-page__head-text'>
                    <PanelTitle size='base' as='h3'>
                      {team.name}
                    </PanelTitle>
                    <MetricLabel>{team.description}</MetricLabel>
                  </div>
                  <span className='settings-page__actions'>
                    {team.is_public ? <Chip tone='ghost'>public</Chip> : null}
                    <Button
                      danger
                      onClick={() => {
                        handleDelete(team);
                      }}
                    >
                      Delete
                    </Button>
                  </span>
                </div>
                <div className='teams-page__meta'>
                  {team.id !== undefined ? (
                    <MembersStrip teamId={team.id} />
                  ) : null}
                </div>
              </div>
            </Panel>
          ))}
        </div>
      )}

      <Modal
        title='Create team'
        open={createOpen}
        onCancel={() => {
          setCreateOpen(false);
          createForm.resetFields();
        }}
        onOk={handleCreate}
        okText='Create'
        confirmLoading={submitting}
        destroyOnClose
      >
        <Form form={createForm} layout='vertical'>
          <Form.Item
            name='name'
            label='Name'
            rules={[{ required: true, message: 'name is required' }]}
          >
            <Input placeholder='Platform Team' />
          </Form.Item>
          <Form.Item name='description' label='Description'>
            <Input.TextArea rows={3} placeholder='What does this team own?' />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
