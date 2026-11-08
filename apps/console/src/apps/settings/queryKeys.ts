export const settingsKeys = {
  profile: ['settings', 'profile'] as const,
  subscriptions: ['settings', 'notification-subscriptions'] as const,
  apiKeys: ['settings', 'api-keys'] as const,
  apiKeysPage: (page: number) => ['settings', 'api-keys', page] as const,
  users: ['settings', 'users'] as const,
  usersPage: (page: number) => ['settings', 'users', page] as const,
  assignableRoles: ['settings', 'roles', 'assignable'] as const,
  teams: ['settings', 'teams'] as const,
  teamMembers: (teamId: number) =>
    ['settings', 'teams', teamId, 'members'] as const,
  roles: ['settings', 'roles'] as const,
  oidcClients: ['settings', 'oidc-clients'] as const,
  identityProviders: ['settings', 'identity-providers'] as const,
  auditLogsPage: (page: number) => ['settings', 'audit-logs', page] as const,
};
