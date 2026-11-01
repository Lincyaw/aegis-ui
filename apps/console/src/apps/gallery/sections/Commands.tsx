import type { ReactNode } from 'react';

import {
  LogoutOutlined,
  PlusOutlined,
  SearchOutlined,
  SettingOutlined,
  UserOutlined,
} from '@ant-design/icons';
import {
  type Command,
  CommandPalette,
  CommandProvider,
  MetricLabel,
  Panel,
  PanelTitle,
  SectionDivider,
  useCommands,
  useRegisterCommands,
} from '@lincyaw/aegis-ui';
import { Button } from 'antd';

function CommandGallerySpecimen(): ReactNode {
  const { setPaletteOpen } = useCommands();
  const cmds: Command[] = [
    {
      id: 'projects.create',
      label: 'Create project',
      description: 'Spin up a new project workspace.',
      group: 'Quick actions',
      icon: <PlusOutlined />,
      shortcut: 'mod+shift+n',
      keywords: ['new', 'project', 'add'],
      handler: () => console.warn('[demo] create project'),
    },
    {
      id: 'experiments.run',
      label: 'Run experiment',
      description: 'Trigger the default experiment pipeline.',
      group: 'Quick actions',
      keywords: ['run', 'start', 'go'],
      handler: () => console.warn('[demo] run experiment'),
    },
    {
      id: 'search.global',
      label: 'Global search',
      description: 'Search across every workspace.',
      group: 'Navigate',
      icon: <SearchOutlined />,
      shortcut: 'mod+/',
      handler: () => console.warn('[demo] global search'),
    },
    {
      id: 'nav.dashboard',
      label: 'Go to dashboard',
      group: 'Navigate',
      handler: () => console.warn('[demo] dashboard'),
    },
    {
      id: 'nav.inbox',
      label: 'Go to inbox',
      group: 'Navigate',
      keywords: ['notifications'],
      handler: () => console.warn('[demo] inbox'),
    },
    {
      id: 'settings.profile',
      label: 'Edit profile',
      description: 'Update your name, avatar and contact info.',
      group: 'Settings',
      icon: <UserOutlined />,
      handler: () => console.warn('[demo] profile'),
    },
    {
      id: 'settings.preferences',
      label: 'Preferences',
      description: 'Theme, density, keyboard shortcuts.',
      group: 'Settings',
      icon: <SettingOutlined />,
      shortcut: 'mod+,',
      handler: () => console.warn('[demo] preferences'),
    },
    {
      id: 'session.signout',
      label: 'Sign out',
      group: 'Settings',
      icon: <LogoutOutlined />,
      handler: () => console.warn('[demo] sign out'),
    },
  ];
  useRegisterCommands(cmds);

  return (
    <div className='gallery__specimen-row'>
      <Button type='primary' onClick={() => setPaletteOpen(true)}>
        Open palette (or press ⌘K)
      </Button>
      <span className='gallery__specimen-hint'>
        mod+k toggles globally while a CommandProvider is mounted.
      </span>
    </div>
  );
}

export function CommandsSection() {
  return (
    <Panel
      title={<PanelTitle size='lg'>Commands · command palette</PanelTitle>}
      extra={<MetricLabel>cmdk</MetricLabel>}
    >
      <p className='gallery__panel-body'>
        A command registry + searchable palette. Mount{' '}
        <code>&lt;CommandProvider&gt;</code> once, then register commands per
        app via <code>useRegisterCommands</code>. Press <code>⌘K</code> /{' '}
        <code>Ctrl+K</code> to toggle, or click the button below.
      </p>
      <SectionDivider>CommandPalette</SectionDivider>
      <CommandProvider>
        <CommandGallerySpecimen />
        <CommandPalette />
      </CommandProvider>
    </Panel>
  );
}
