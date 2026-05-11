import {
  EmptyState,
  PageHeader,
  Panel,
  useAppNavigate,
} from '@OperationsPAI/aegis-ui';

export default function DatasetCreate() {
  const navigate = useAppNavigate();

  return (
    <div className='page-wrapper'>
      <PageHeader
        title='New Dataset'
        description='Create a new evaluation dataset.'
        action={
          <button
            type='button'
            className='settings-demo-danger-btn'
            onClick={() => navigate('datasets')}
          >
            Cancel
          </button>
        }
      />
      <Panel>
        <EmptyState
          title='Dataset form'
          description='Dataset creation form will appear here.'
        />
      </Panel>
    </div>
  );
}
