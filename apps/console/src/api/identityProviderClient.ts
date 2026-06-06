/**
 * Client for aegis-sso's /v1/identity-providers admin surface (federated
 * login provider CRUD). Goes through the same /v1/* path the OIDC client
 * admin uses (forwarded to the sso upstream). client_secret is write-only —
 * it is never returned by the API.
 */
import { apiFetch, apiJson, type Envelope } from './apiClient';

export interface IdentityProvider {
  id: number;
  name: string;
  display_name: string;
  type: 'oidc' | 'oauth2';
  client_id: string;
  discovery_url?: string;
  authorize_url?: string;
  token_url?: string;
  userinfo_url?: string;
  scopes: string;
  auto_provision: boolean;
  enabled: boolean;
}

export interface CreateProviderReq {
  name: string;
  display_name: string;
  type?: string;
  client_id: string;
  client_secret: string;
  discovery_url?: string;
  authorize_url?: string;
  token_url?: string;
  userinfo_url?: string;
  scopes?: string;
  auto_provision?: boolean;
  default_roles?: string;
}

export interface UpdateProviderReq {
  display_name?: string;
  client_id?: string;
  client_secret?: string;
  discovery_url?: string;
  authorize_url?: string;
  token_url?: string;
  userinfo_url?: string;
  scopes?: string;
  auto_provision?: boolean;
  default_roles?: string;
  enabled?: boolean;
}

export async function listProviders(): Promise<IdentityProvider[]> {
  const env = await apiJson<Envelope<IdentityProvider[] | null>>(
    '/v1/identity-providers'
  );
  return env.data ?? [];
}

export async function createProvider(
  req: CreateProviderReq
): Promise<IdentityProvider> {
  const env = await apiJson<Envelope<IdentityProvider>>(
    '/v1/identity-providers',
    { method: 'POST', body: JSON.stringify(req) }
  );
  return env.data;
}

export async function updateProvider(
  id: number,
  patch: UpdateProviderReq
): Promise<IdentityProvider> {
  const env = await apiJson<Envelope<IdentityProvider>>(
    `/v1/identity-providers/${id.toString()}`,
    { method: 'PUT', body: JSON.stringify(patch) }
  );
  return env.data;
}

export async function deleteProvider(id: number): Promise<void> {
  await apiFetch(`/v1/identity-providers/${id.toString()}`, {
    method: 'DELETE',
  });
}
