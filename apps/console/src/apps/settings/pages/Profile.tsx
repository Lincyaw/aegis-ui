import { useState } from 'react';

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
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { App, Button, Spin } from 'antd';
import { isAxiosError } from 'axios';

import { ApiError, errMsg } from '../../../api/apiClient';
import { authenticationApi } from '../../../api/portalClient';
import { updateUser } from '../api/iamClient';
import { settingsKeys } from '../queryKeys';
import '../settings.css';

function isForbidden(e: unknown): boolean {
  if (isAxiosError(e)) {
    return e.response?.status === 403;
  }
  if (e instanceof ApiError) {
    return e.status === 403;
  }
  return false;
}

async function readProfile(): Promise<AuthUserProfileResp | null> {
  const res = await authenticationApi.getCurrentUserProfile();
  return res.data.data ?? null;
}

const HEADER = (
  <PageHeader
    title='Profile'
    description='Manage your personal information and security settings.'
  />
);

export default function Profile() {
  const profileQuery = useQuery({
    queryKey: settingsKeys.profile,
    queryFn: readProfile,
  });

  if (profileQuery.isPending) {
    return (
      <>
        {HEADER}
        <Panel>
          <div className='settings-page__loading'>
            <Spin />
          </div>
        </Panel>
      </>
    );
  }

  if (profileQuery.isError) {
    return (
      <>
        {HEADER}
        <Panel>
          <ErrorState
            title='Could not load profile'
            description={errMsg(profileQuery.error)}
            action={
              <Button
                onClick={() => {
                  void profileQuery.refetch();
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

  return (
    <ProfileForm key={profileQuery.data?.id} profile={profileQuery.data} />
  );
}

function ProfileForm({ profile }: { profile: AuthUserProfileResp | null }) {
  const { message: msg } = App.useApp();
  const queryClient = useQueryClient();
  const [fullName, setFullName] = useState(profile?.full_name ?? '');
  const [savingIdentity, setSavingIdentity] = useState(false);

  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  const handleSaveIdentity = async (): Promise<void> => {
    if (profile?.id === undefined) {
      return;
    }
    setSavingIdentity(true);
    try {
      await updateUser(profile.id, { full_name: fullName.trim() });
      void msg.success('Profile updated');
      await queryClient.invalidateQueries({ queryKey: settingsKeys.profile });
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

  const name = profile?.full_name || profile?.username || '';
  const email = profile?.email ?? '';

  return (
    <>
      {HEADER}
      <Panel>
        <SettingsSection
          title='Identity'
          description='How you appear across AegisLab.'
        >
          <FormRow
            label='Display name'
            description='Shown to teammates.'
            controlId='profile-full-name'
          >
            <TextField
              id='profile-full-name'
              aria-describedby='profile-full-name-description'
              value={fullName}
              onChange={(e) => {
                setFullName(e.target.value);
              }}
            />
          </FormRow>
          <FormRow
            label='Email'
            description='Used for sign-in and notifications.'
            controlId='profile-email'
          >
            <TextField
              id='profile-email'
              aria-describedby='profile-email-description'
              type='email'
              value={email}
              disabled
            />
          </FormRow>
          <FormRow label='Avatar' description='Generated from your name.'>
            <Avatar name={name || 'Aegis User'} size='lg' />
          </FormRow>
          <div className='settings-page__form-actions'>
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
          <FormRow
            label='Current password'
            description='Confirm it’s you.'
            controlId='profile-current-password'
          >
            <PasswordField
              id='profile-current-password'
              aria-describedby='profile-current-password-description'
              value={oldPassword}
              onChange={(e) => {
                setOldPassword(e.target.value);
              }}
            />
          </FormRow>
          <FormRow
            label='New password'
            description='At least 8 characters.'
            controlId='profile-new-password'
          >
            <PasswordField
              id='profile-new-password'
              aria-describedby='profile-new-password-description'
              value={newPassword}
              onChange={(e) => {
                setNewPassword(e.target.value);
              }}
              helperText='Use a mix of letters, numbers, and symbols.'
            />
          </FormRow>
          <FormRow
            label='Confirm new password'
            description='Type it again.'
            controlId='profile-confirm-password'
          >
            <PasswordField
              id='profile-confirm-password'
              aria-describedby='profile-confirm-password-description'
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
              }}
            />
          </FormRow>
          <div className='settings-page__form-actions'>
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
