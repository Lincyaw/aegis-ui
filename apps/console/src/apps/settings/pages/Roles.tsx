import { MonoValue, PageHeader, Panel } from '@lincyaw/aegis-ui';
import { Button, Checkbox } from 'antd';

import './Roles.css';

type RoleId = 'admin' | 'editor' | 'viewer' | 'custom';

interface Permission {
  key: string;
  label: string;
  defaults: Record<Exclude<RoleId, 'admin'>, boolean>;
}

interface Category {
  name: string;
  permissions: Permission[];
}

const ROLES: Array<{ id: RoleId; label: string }> = [
  { id: 'admin', label: 'Admin' },
  { id: 'editor', label: 'Editor' },
  { id: 'viewer', label: 'Viewer' },
  { id: 'custom', label: 'Custom' },
];

const CATEGORIES: Category[] = [
  {
    name: 'Projects',
    permissions: [
      {
        key: 'projects:view',
        label: 'View projects',
        defaults: { editor: true, viewer: true, custom: true },
      },
      {
        key: 'projects:create',
        label: 'Create projects',
        defaults: { editor: true, viewer: false, custom: false },
      },
      {
        key: 'projects:delete',
        label: 'Delete projects',
        defaults: { editor: false, viewer: false, custom: false },
      },
    ],
  },
  {
    name: 'Datasets',
    permissions: [
      {
        key: 'datasets:view',
        label: 'View datasets',
        defaults: { editor: true, viewer: true, custom: true },
      },
      {
        key: 'datasets:upload',
        label: 'Upload datasets',
        defaults: { editor: true, viewer: false, custom: false },
      },
      {
        key: 'datasets:delete',
        label: 'Delete datasets',
        defaults: { editor: false, viewer: false, custom: false },
      },
    ],
  },
  {
    name: 'Injections',
    permissions: [
      {
        key: 'injections:view',
        label: 'View injection runs',
        defaults: { editor: true, viewer: true, custom: true },
      },
      {
        key: 'injections:run',
        label: 'Run injections',
        defaults: { editor: true, viewer: false, custom: true },
      },
      {
        key: 'injections:abort',
        label: 'Abort running injections',
        defaults: { editor: true, viewer: false, custom: false },
      },
    ],
  },
  {
    name: 'Users & Access',
    permissions: [
      {
        key: 'users:view',
        label: 'View users',
        defaults: { editor: true, viewer: true, custom: false },
      },
      {
        key: 'users:invite',
        label: 'Invite users',
        defaults: { editor: false, viewer: false, custom: false },
      },
      {
        key: 'roles:configure',
        label: 'Configure roles',
        defaults: { editor: false, viewer: false, custom: false },
      },
    ],
  },
  {
    name: 'Settings',
    permissions: [
      {
        key: 'settings:view',
        label: 'View workspace settings',
        defaults: { editor: true, viewer: true, custom: true },
      },
      {
        key: 'settings:edit',
        label: 'Edit workspace settings',
        defaults: { editor: false, viewer: false, custom: false },
      },
      {
        key: 'audit:view',
        label: 'View audit logs',
        defaults: { editor: false, viewer: false, custom: false },
      },
    ],
  },
];

function CategoryRows({ category }: { category: Category }) {
  return (
    <>
      <tr className='roles-page__category-row'>
        <td colSpan={ROLES.length + 1} className='roles-page__category'>
          {category.name}
        </td>
      </tr>
      {category.permissions.map((perm) => (
        <tr key={perm.key} className='roles-page__row'>
          <td className='roles-page__perm'>
            <span className='roles-page__perm-label'>{perm.label}</span>
            <MonoValue size='sm' weight='regular'>
              {perm.key}
            </MonoValue>
          </td>
          <td className='roles-page__cell'>
            <Checkbox checked disabled />
          </td>
          <td className='roles-page__cell'>
            <Checkbox defaultChecked={perm.defaults.editor} />
          </td>
          <td className='roles-page__cell'>
            <Checkbox defaultChecked={perm.defaults.viewer} />
          </td>
          <td className='roles-page__cell'>
            <Checkbox defaultChecked={perm.defaults.custom} />
          </td>
        </tr>
      ))}
    </>
  );
}

export default function Roles() {
  return (
    <>
      <PageHeader
        title='Roles & Permissions'
        description='Define what each role can do.'
        action={<Button type='primary'>+ Create role</Button>}
      />
      <Panel padded={false}>
        <div className='roles-page__scroll'>
          <table className='roles-page__matrix'>
            <thead>
              <tr>
                <th className='roles-page__head roles-page__head--perm'>
                  Permission
                </th>
                {ROLES.map((r) => (
                  <th
                    key={r.id}
                    className='roles-page__head roles-page__head--role'
                  >
                    {r.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {CATEGORIES.map((cat) => (
                <CategoryRows key={cat.name} category={cat} />
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </>
  );
}
