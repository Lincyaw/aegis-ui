import { type ReactElement } from 'react';

import type { AegisAuthUser } from '../../auth';
import { Chip } from '../../components/ui/Chip';
import { EmptyState } from '../../components/ui/EmptyState';
import type { AegisApp } from './types';

interface AuthRequiredCardProps {
  app: AegisApp;
  status: 'loading' | 'authenticated' | 'unauthenticated';
  user: AegisAuthUser | null;
  onSignIn?: () => void;
}

/**
 * Rendered in place of an app's content when the current user is not
 * authorized to view it. Distinguishes between "needs login" and
 * "logged in but missing role" so the message and call-to-action match.
 */
export function AuthRequiredCard({
  app,
  status,
  user,
  onSignIn,
}: AuthRequiredCardProps): ReactElement {
  if (status === 'loading') {
    return <EmptyState title="Checking your session…" />;
  }
  if (status === 'unauthenticated') {
    return (
      <EmptyState
        title={`Sign in to use ${app.label}`}
        description={
          app.description ??
          'This app needs an authenticated session. Sign in to continue.'
        }
        action={
          onSignIn ? (
            <Chip tone="ink" onClick={onSignIn}>
              Sign in
            </Chip>
          ) : undefined
        }
      />
    );
  }
  const userRoles = user?.roles ?? [];
  const required = app.requiredRoles ?? [];
  return (
    <EmptyState
      title="Insufficient permissions"
      description={
        required.length
          ? `${app.label} requires one of: ${required.join(', ')}. Your roles: ${
              userRoles.length ? userRoles.join(', ') : '(none)'
            }.`
          : `You don't have access to ${app.label}.`
      }
    />
  );
}
