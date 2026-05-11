import { Button } from 'antd';

import {
  Avatar,
  Chip,
  DangerZone,
  FormRow,
  PageHeader,
  Panel,
  PasswordField,
  SettingsSection,
  TextField,
  useAuth,
} from '@OperationsPAI/aegis-ui';

const noop = (): void => undefined;

const actionRowStyle = {
  display: 'flex',
  justifyContent: 'flex-end',
  paddingTop: 'var(--space-2)',
};

export default function Profile() {
  const { user } = useAuth();
  const name = user?.name ?? '';
  const email = user?.email ?? '';

  return (
    <>
      <PageHeader
        title='Profile'
        description='Manage your personal information and security settings.'
      />
      <Panel>
        <SettingsSection
          title='Identity'
          description='How you appear across AegisLab.'
        >
          <FormRow label='Display name' description='Shown to teammates.'>
            <TextField defaultValue={name} />
          </FormRow>
          <FormRow
            label='Email'
            description='Used for sign-in and notifications.'
          >
            <TextField type='email' defaultValue={email} />
          </FormRow>
          <FormRow label='Avatar' description='Generated from your name.'>
            <Avatar name={name || 'Aegis User'} size='lg' />
          </FormRow>
          <div style={actionRowStyle}>
            <Button type='primary' onClick={noop}>
              Save changes
            </Button>
          </div>
        </SettingsSection>

        <SettingsSection
          title='Password'
          description='Change the password used to sign in.'
        >
          <FormRow label='Current password' description='Confirm it’s you.'>
            <PasswordField />
          </FormRow>
          <FormRow label='New password' description='At least 8 characters.'>
            <PasswordField helperText='Use a mix of letters, numbers, and symbols.' />
          </FormRow>
          <FormRow label='Confirm new password' description='Type it again.'>
            <PasswordField />
          </FormRow>
          <div style={actionRowStyle}>
            <Button type='primary' onClick={noop}>
              Update password
            </Button>
          </div>
        </SettingsSection>

        <SettingsSection
          title='Two-factor authentication'
          description='Add an extra layer of security to your account.'
        >
          <FormRow
            label='Authenticator app'
            description='Use Google Authenticator, 1Password, or similar.'
          >
            <Chip tone='ghost'>Not enabled</Chip>
          </FormRow>
          <div style={actionRowStyle}>
            <Button onClick={noop}>Enable 2FA</Button>
          </div>
        </SettingsSection>

        <DangerZone description='Permanently delete your account and all associated data. This cannot be undone.'>
          <FormRow
            label='Delete account'
            description='Your projects, datasets, and audit history will be removed.'
          >
            <Button danger onClick={noop}>
              Delete account
            </Button>
          </FormRow>
        </DangerZone>
      </Panel>
    </>
  );
}
