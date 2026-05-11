import {
  EmptyState,
  PageHeader,
  Panel,
  useAppNavigate,
} from '@OperationsPAI/aegis-ui';

export default function ContainerCreate() {
  const navigate = useAppNavigate();

  return (
    <div className='page-wrapper'>
      <PageHeader
        title='Register Container'
        description='Register a new container, version, and helm configuration.'
        action={
          <button
            type='button'
            className='settings-demo-danger-btn'
            onClick={() => navigate('containers')}
          >
            Cancel
          </button>
        }
      />
      <Panel>
        <EmptyState
          title='Container form'
          description='Container registration form will appear here.'
        />
      </Panel>
    </div>
  );
}
