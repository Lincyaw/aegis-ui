/**
 * Client for the aegis IAM admin surface (`/api/v2/users`,
 * `/api/v2/roles`, `/api/v2/permissions`). The generated `@lincyaw/portal`
 * SDK only ships the SSO authorization endpoints (`SSOAdminApi`), not this
 * v2 IAM CRUD surface, so this hand-rolled module mirrors `ssoAdminClient.ts`.
 *
 * List endpoints reject `size < 10` with a 400, so callers must page with
 * `size >= 10`.
 */
import {
  apiData,
  apiFetch,
  normalizeList,
  pageQs,
  type PageReq,
  type Paginated,
} from './apiClient';

export interface UserRole {
  id: number;
  name: string;
}

export interface IamUser {
  id: number;
  username: string;
  email: string;
  full_name: string;
  avatar: string;
  is_active: boolean;
  status: string;
  last_login_at: string;
  roles: UserRole[] | null;
}

export interface CreateUserReq {
  username: string;
  email: string;
  full_name: string;
  password: string;
}

export interface UpdateUserReq {
  full_name?: string;
  email?: string;
  avatar?: string;
  is_active?: boolean;
}

export interface IamRole {
  id: number;
  name: string;
  description: string;
  permissions: IamPermission[] | null;
}

export interface IamPermission {
  id: number;
  name: string;
  description?: string;
  resource?: string;
  action?: string;
}

export async function listUsers(
  p: PageReq = {}
): Promise<{ items: IamUser[]; total: number }> {
  const data = await apiData<Paginated<IamUser> | null>(
    `/api/v2/users${pageQs(p)}`
  );
  return normalizeList(data);
}

export async function createUser(req: CreateUserReq): Promise<IamUser> {
  return apiData<IamUser>('/api/v2/users', {
    method: 'POST',
    body: JSON.stringify(req),
  });
}

export async function updateUser(
  id: number,
  req: UpdateUserReq
): Promise<IamUser> {
  return apiData<IamUser>(`/api/v2/users/${String(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(req),
  });
}

export async function deleteUser(id: number): Promise<void> {
  await apiFetch(`/api/v2/users/${String(id)}`, { method: 'DELETE' });
}

export async function assignUserRole(
  userId: number,
  roleId: number
): Promise<void> {
  await apiFetch(`/api/v2/users/${String(userId)}/roles/${String(roleId)}`, {
    method: 'POST',
  });
}

export async function removeUserRole(
  userId: number,
  roleId: number
): Promise<void> {
  await apiFetch(`/api/v2/users/${String(userId)}/roles/${String(roleId)}`, {
    method: 'DELETE',
  });
}

export async function listRoles(
  p: PageReq = {}
): Promise<{ items: IamRole[]; total: number }> {
  const data = await apiData<Paginated<IamRole> | null>(
    `/api/v2/roles${pageQs(p)}`
  );
  return normalizeList(data);
}

export async function getRole(roleId: number): Promise<IamRole> {
  return apiData<IamRole>(`/api/v2/roles/${String(roleId)}`);
}

export async function createRole(req: {
  name: string;
  display_name: string;
  description?: string;
}): Promise<IamRole> {
  return apiData<IamRole>('/api/v2/roles', {
    method: 'POST',
    body: JSON.stringify(req),
  });
}

export async function assignRolePermissions(
  roleId: number,
  permissionIds: number[]
): Promise<void> {
  await apiFetch(`/api/v2/roles/${String(roleId)}/permissions/assign`, {
    method: 'POST',
    body: JSON.stringify({ permission_ids: permissionIds }),
  });
}

export async function removeRolePermissions(
  roleId: number,
  permissionIds: number[]
): Promise<void> {
  await apiFetch(`/api/v2/roles/${String(roleId)}/permissions/remove`, {
    method: 'POST',
    body: JSON.stringify({ permission_ids: permissionIds }),
  });
}

export async function listPermissions(): Promise<IamPermission[]> {
  const data = await apiData<Paginated<IamPermission> | null>(
    '/api/v2/permissions'
  );
  return normalizeList(data).items;
}
