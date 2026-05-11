import {
  EmptyState,
  PageHeader,
  Panel,
  useAppNavigate,
} from '@OperationsPAI/aegis-ui';

export default function LabelCreate() {
  const navigate = useAppNavigate();

  return (
    <div className='page-wrapper'>
      <PageHeader
        title='New Label'
        description='Create a custom label for organizing resources.'
        action={
          <button
            type='button'
            className='settings-demo-danger-btn'
            onClick={() => navigate('labels')}
          >
            Cancel
          </button>
        }
      />
      <Panel>
        <EmptyState
          title='Label form'
          description='Label creation form will appear here.'
        />
      </Panel>
    </div>
  );
}
