import { type ReactElement } from 'react';

import type { AegisAuthUser, AuthStatus } from '../../auth';
import { Chip } from '../../components/ui/Chip';
import { EmptyState } from '../../components/ui/EmptyState';
import { useStrings } from '../../locale';
import type { AegisApp } from './types';

interface AuthRequiredCardProps {
  app: AegisApp;
  status: AuthStatus;
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
  const strings = useStrings();
  if (status === 'loading') {
    return <EmptyState title={strings.authChecking} />;
  }
  if (status === 'unauthenticated') {
    return (
      <EmptyState
        title={strings.authSignInTo(app.label)}
        description={app.description ?? strings.authSignInDescription}
        action={
          onSignIn ? (
            <Chip tone="ink" onClick={onSignIn}>
              {strings.signIn}
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
      title={strings.authForbiddenTitle}
      description={
        required.length
          ? strings.authForbiddenRoles(app.label, required, userRoles)
          : strings.authForbidden(app.label)
      }
    />
  );
}
