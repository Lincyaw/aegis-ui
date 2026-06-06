import { useCallback, useEffect, useMemo, useState } from 'react';

import { EmptyState, ErrorState, MonoValue, PageHeader, Panel } from '@lincyaw/aegis-ui';
import { App, Button, Checkbox, Form, Input, Modal, Spin } from 'antd';

import { ApiError } from '../../../api/apiClient';
import {
  assignRolePermissions,
  createRole,
  getRole,
  type IamPermission,
  type IamRole,
  listPermissions,
  listRoles,
  removeRolePermissions,
} from '../../../api/iamClient';

import './Roles.css';

function errMsg(e: unknown): string {
  if (e instanceof ApiError || e instanceof Error) {
    return e.message;
  }
  return 'unknown error';
}

function permLabel(p: IamPermission): string {
  return p.description?.trim() || p.name;
}

function permCategory(p: IamPermission): string {
  if (p.resource) {
    return p.resource;
  }
  const sep = p.name.indexOf(':');
  return sep > 0 ? p.name.slice(0, sep) : 'General';
}

interface CreateRoleForm {
  name: string;
  description: string;
}

export default function Roles() {
  const { message: msg } = App.useApp();
  const [roles, setRoles] = useState<IamRole[]>([]);
  const [permissions, setPermissions] = useState<IamPermission[]>([]);
  // role id -> set of permission ids it holds
  const [rolePerms, setRolePerms] = useState<Record<number, Set<number>>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingCell, setSavingCell] = useState<string | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [createForm] = Form.useForm<CreateRoleForm>();
  const [submitting, setSubmitting] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [rolesRes, perms] = await Promise.all([
        listRoles({ page: 1, size: 50 }),
        listPermissions(),
      ]);
      setPermissions(perms);
      setRoles(rolesRes.items);
      // Fetch each role's permission set; the list endpoint may not embed it.
      const details = await Promise.all(
        rolesRes.items.map(async (r) => {
          const embedded = r.permissions;
          if (embedded && embedded.length > 0) {
            return [r.id, embedded] as const;
          }
          try {
            const full = await getRole(r.id);
            return [r.id, full.permissions ?? []] as const;
          } catch {
            return [r.id, [] as IamPermission[]] as const;
          }
        })
      );
      const map: Record<number, Set<number>> = {};
      details.forEach(([id, perms2]) => {
        map[id] = new Set(perms2.map((p) => p.id));
      });
      setRolePerms(map);
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const categories = useMemo(() => {
    const byCat = new Map<string, IamPermission[]>();
    permissions.forEach((p) => {
      const cat = permCategory(p);
      const list = byCat.get(cat) ?? [];
      list.push(p);
      byCat.set(cat, list);
    });
    return [...byCat.entries()]
      .map(([name, perms]) => ({ name, perms }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [permissions]);

  const toggle = (role: IamRole, perm: IamPermission, checked: boolean): void => {
    const cellKey = `${String(role.id)}:${String(perm.id)}`;
    setSavingCell(cellKey);
    void (async () => {
      try {
        if (checked) {
          await assignRolePermissions(role.id, [perm.id]);
        } else {
          await removeRolePermissions(role.id, [perm.id]);
        }
        setRolePerms((prev) => {
          const next = { ...prev };
          const set = new Set(next[role.id] ?? []);
          if (checked) {
            set.add(perm.id);
          } else {
            set.delete(perm.id);
          }
          next[role.id] = set;
          return next;
        });
      } catch (e) {
        void msg.error(`Update failed: ${errMsg(e)}`);
      } finally {
        setSavingCell(null);
      }
    })();
  };

  const handleCreate = (): void => {
    createForm
      .validateFields()
      .then(async (values) => {
        setSubmitting(true);
        try {
          await createRole({
            name: values.name.trim(),
            display_name: values.name.trim(),
            description: values.description.trim() || undefined,
          });
          void msg.success('Role created');
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

  return (
    <>
      <PageHeader
        title='Roles & Permissions'
        description='Define what each role can do.'
        action={
          <Button
            type='primary'
            onClick={() => {
              setCreateOpen(true);
            }}
          >
            + Create role
          </Button>
        }
      />
      {error !== null ? (
        <Panel>
          <ErrorState
            title='Could not load roles'
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
      ) : roles.length === 0 || permissions.length === 0 ? (
        <Panel>
          <EmptyState
            title='Nothing to configure'
            description={
              roles.length === 0
                ? 'Create a role to start assigning permissions.'
                : 'No permissions are registered yet.'
            }
          />
        </Panel>
      ) : (
        <Panel padded={false}>
          <div className='roles-page__scroll'>
            <table className='roles-page__matrix'>
              <thead>
                <tr>
                  <th className='roles-page__head roles-page__head--perm'>
                    Permission
                  </th>
                  {roles.map((r) => (
                    <th
                      key={r.id}
                      className='roles-page__head roles-page__head--role'
                    >
                      {r.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {categories.map((cat) => (
                  <CategoryRows
                    key={cat.name}
                    categoryName={cat.name}
                    perms={cat.perms}
                    roles={roles}
                    rolePerms={rolePerms}
                    savingCell={savingCell}
                    onToggle={toggle}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      )}

      <Modal
        title='Create role'
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
            <Input placeholder='editor' />
          </Form.Item>
          <Form.Item name='description' label='Description'>
            <Input.TextArea rows={2} placeholder='What can this role do?' />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}

function CategoryRows({
  categoryName,
  perms,
  roles,
  rolePerms,
  savingCell,
  onToggle,
}: {
  categoryName: string;
  perms: IamPermission[];
  roles: IamRole[];
  rolePerms: Record<number, Set<number>>;
  savingCell: string | null;
  onToggle: (role: IamRole, perm: IamPermission, checked: boolean) => void;
}) {
  return (
    <>
      <tr className='roles-page__category-row'>
        <td colSpan={roles.length + 1} className='roles-page__category'>
          {categoryName}
        </td>
      </tr>
      {perms.map((perm) => (
        <tr key={perm.id} className='roles-page__row'>
          <td className='roles-page__perm'>
            <span className='roles-page__perm-label'>{permLabel(perm)}</span>
            <MonoValue size='sm' weight='regular'>
              {perm.name}
            </MonoValue>
          </td>
          {roles.map((role) => {
            const checked = rolePerms[role.id]?.has(perm.id) ?? false;
            return (
              <td key={role.id} className='roles-page__cell'>
                <Checkbox
                  checked={checked}
                  disabled={savingCell !== null}
                  onChange={(e) => {
                    onToggle(role, perm, e.target.checked);
                  }}
                />
              </td>
            );
          })}
        </tr>
      ))}
    </>
  );
}
