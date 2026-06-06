import { useCallback, useEffect, useState } from 'react';

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
import type {
  TeamTeamMemberResp,
  TeamTeamResp,
} from '@lincyaw/portal';
import { App, Button, Form, Input, Modal, Spin } from 'antd';
import { isAxiosError } from 'axios';

import { teamsApi } from '../../portal/api/portal-client';

import './Teams.css';

const MAX_VISIBLE = 5;

function errMsg(e: unknown): string {
  if (isAxiosError(e)) {
    const data = e.response?.data as { message?: string } | undefined;
    return data?.message ?? e.message;
  }
  if (e instanceof Error) {
    return e.message;
  }
  return 'unknown error';
}

interface CreateForm {
  name: string;
  description: string;
}

function MembersStrip({ teamId }: { teamId: number }) {
  const [members, setMembers] = useState<TeamTeamMemberResp[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await teamsApi.listTeamMembers({ teamId, page: 1, size: 10 });
        if (cancelled) {
          return;
        }
        const data = res.data.data;
        setMembers(data?.items ?? []);
        setTotal(data?.pagination?.total ?? data?.items?.length ?? 0);
      } catch {
        /* member strip is best-effort; team card still renders */
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [teamId]);

  if (loading) {
    return <Spin size='small' />;
  }
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
  const [teams, setTeams] = useState<TeamTeamResp[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm] = Form.useForm<CreateForm>();
  const [submitting, setSubmitting] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await teamsApi.listTeams({ page: 1, size: 50 });
      setTeams(res.data.data?.items ?? []);
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

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
      {error !== null ? (
        <Panel>
          <ErrorState
            title='Could not load teams'
            description={error}
            action={
              <Button
                onClick={() => {
                  void refresh();
                }}
              >
                Try again
              </Button>
            }
          />
        </Panel>
      ) : loading ? (
        <Panel>
          <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--space-6)' }}>
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
                  <span style={{ display: 'flex', gap: 'var(--space-2)' }}>
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
