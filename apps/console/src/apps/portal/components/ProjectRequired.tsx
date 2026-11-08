import {
  Button,
  EmptyState,
  Panel,
  SkeletonText,
  useAppNavigate,
} from '@lincyaw/aegis-ui';

import type { ActiveProject } from '../hooks/useActiveProject';

import { LoadError } from './LoadError';

/** What a project-scoped page shows while it has no active project. */
export function ProjectRequired({ active }: { active: ActiveProject }) {
  const navigate = useAppNavigate();
  if (active.isLoading) {
    return (
      <Panel>
        <SkeletonText />
      </Panel>
    );
  }
  if (active.error) {
    return (
      <Panel>
        <LoadError error={active.error} title='Failed to load projects' />
      </Panel>
    );
  }
  return (
    <Panel>
      <EmptyState
        title='No projects yet'
        description='Injections, executions and the dashboard belong to a project.'
        action={
          <Button tone='primary' onClick={() => navigate('projects/new')}>
            New project
          </Button>
        }
      />
    </Panel>
  );
}
