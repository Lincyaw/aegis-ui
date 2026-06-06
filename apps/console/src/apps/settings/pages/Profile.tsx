import { useCallback, useEffect, useState } from 'react';

import {
  Avatar,
  Chip,
  DangerZone,
  ErrorState,
  FormRow,
  PageHeader,
  Panel,
  PasswordField,
  SettingsSection,
  TextField,
} from '@lincyaw/aegis-ui';
import type { AuthUserProfileResp } from '@lincyaw/portal';
import { App, Button, Spin } from 'antd';
import { isAxiosError } from 'axios';

import { ApiError } from '../../../api/apiClient';
import { updateUser } from '../../../api/iamClient';
import { authenticationApi } from '../../portal/api/portal-client';

function errMsg(e: unknown): string {
  if (isAxiosError(e)) {
    const data = e.response?.data as { message?: string } | undefined;
    return data?.message ?? e.message;
  }
  if (e instanceof ApiError || e instanceof Error) {
    return e.message;
  }
  return 'unknown error';
}

function isForbidden(e: unknown): boolean {
  if (isAxiosError(e)) {
    return e.response?.status === 403;
  }
  if (e instanceof ApiError) {
    return e.status === 403;
  }
  return false;
}

const actionRowStyle = {
  display: 'flex',
  justifyContent: 'flex-end',
  paddingTop: 'var(--space-2)',
};

export default function Profile() {
  const { message: msg } = App.useApp();
  const [profile, setProfile] = useState<AuthUserProfileResp | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [fullName, setFullName] = useState('');
  const [savingIdentity, setSavingIdentity] = useState(false);

  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await authenticationApi.getCurrentUserProfile();
      const data = res.data.data ?? null;
      setProfile(data);
      setFullName(data?.full_name ?? '');
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const handleSaveIdentity = async (): Promise<void> => {
    if (profile?.id === undefined) {
      return;
    }
    setSavingIdentity(true);
    try {
      await updateUser(profile.id, { full_name: fullName.trim() });
      void msg.success('Profile updated');
      await refresh();
    } catch (e) {
      if (isForbidden(e)) {
        void msg.warning(
          'Editing your profile requires admin access. Contact an administrator.'
        );
      } else {
        void msg.error(`Update failed: ${errMsg(e)}`);
      }
    } finally {
      setSavingIdentity(false);
    }
  };

  const handleChangePassword = async (): Promise<void> => {
    if (!oldPassword || !newPassword) {
      void msg.error('Enter your current and new password.');
      return;
    }
    if (newPassword !== confirmPassword) {
      void msg.error('New password and confirmation do not match.');
      return;
    }
    setSavingPassword(true);
    try {
      await authenticationApi.changePassword({
        authChangePasswordReq: {
          old_password: oldPassword,
          new_password: newPassword,
        },
      });
      void msg.success('Password updated');
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (e) {
      void msg.error(`Password change failed: ${errMsg(e)}`);
    } finally {
      setSavingPassword(false);
    }
  };

  if (loading) {
    return (
      <>
        <PageHeader
          title='Profile'
          description='Manage your personal information and security settings.'
        />
        <Panel>
          <div
            style={{ display: 'flex', justifyContent: 'center', padding: 'var(--space-6)' }}
          >
            <Spin />
          </div>
        </Panel>
      </>
    );
  }

  if (error !== null) {
    return (
      <>
        <PageHeader
          title='Profile'
          description='Manage your personal information and security settings.'
        />
        <Panel>
          <ErrorState
            title='Could not load profile'
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
      </>
    );
  }

  const name = profile?.full_name || profile?.username || '';
  const email = profile?.email ?? '';

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
            <TextField
              value={fullName}
              onChange={(e) => {
                setFullName(e.target.value);
              }}
            />
          </FormRow>
          <FormRow
            label='Email'
            description='Used for sign-in and notifications.'
          >
            <TextField type='email' value={email} disabled />
          </FormRow>
          <FormRow label='Avatar' description='Generated from your name.'>
            <Avatar name={name || 'Aegis User'} size='lg' />
          </FormRow>
          <div style={actionRowStyle}>
            <Button
              type='primary'
              loading={savingIdentity}
              disabled={profile?.id === undefined}
              onClick={() => {
                void handleSaveIdentity();
              }}
            >
              Save changes
            </Button>
          </div>
        </SettingsSection>

        <SettingsSection
          title='Password'
          description='Change the password used to sign in.'
        >
          <FormRow label='Current password' description='Confirm it’s you.'>
            <PasswordField
              value={oldPassword}
              onChange={(e) => {
                setOldPassword(e.target.value);
              }}
            />
          </FormRow>
          <FormRow label='New password' description='At least 8 characters.'>
            <PasswordField
              value={newPassword}
              onChange={(e) => {
                setNewPassword(e.target.value);
              }}
              helperText='Use a mix of letters, numbers, and symbols.'
            />
          </FormRow>
          <FormRow label='Confirm new password' description='Type it again.'>
            <PasswordField
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
              }}
            />
          </FormRow>
          <div style={actionRowStyle}>
            <Button
              type='primary'
              loading={savingPassword}
              onClick={() => {
                void handleChangePassword();
              }}
            >
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
        </SettingsSection>

        <DangerZone description='Account deletion is handled by an administrator. Contact your workspace admin to remove your account.'>
          <FormRow
            label='Delete account'
            description='Your projects, datasets, and audit history will be removed.'
          >
            <Button danger disabled>
              Delete account
            </Button>
          </FormRow>
        </DangerZone>
      </Panel>
    </>
  );
}
