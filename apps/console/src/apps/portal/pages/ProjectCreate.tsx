import {
  EmptyState,
  PageHeader,
  Panel,
  useAppNavigate,
} from '@OperationsPAI/aegis-ui';

export default function ProjectCreate() {
  const navigate = useAppNavigate();

  return (
    <div className='page-wrapper'>
      <PageHeader
        title='New Project'
        description='Create a new fault-injection project.'
        action={
          <button
            type='button'
            className='settings-demo-danger-btn'
            onClick={() => navigate('projects')}
          >
            Cancel
          </button>
        }
      />
      <Panel>
        <EmptyState
          title='Project form'
          description='Project creation form will appear here.'
        />
      </Panel>
    </div>
  );
}
