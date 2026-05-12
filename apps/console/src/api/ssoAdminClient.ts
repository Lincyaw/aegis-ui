/**
 * Client for aegis-sso's /v1/clients admin surface (OIDC client CRUD +
 * secret rotation). Goes through the vite proxy (`/v1/*` → 8083 in
 * dev; configure VITE_SSO_TARGET for other envs).
 */

import { apiFetch, apiJson } from './apiClient';

export interface OidcClient {
  id: number;
  client_id: string;
  name: string;
  service: string;
  redirect_uris: string[];
  grants: string[];
  scopes: string[];
  is_confidential: boolean;
  status: number;
  created_at: string;
  updated_at: string;
}

export interface CreateClientReq {
  client_id: string;
  name: string;
  service: string;
  redirect_uris: string[];
  grants: string[];
  scopes: string[];
  is_confidential?: boolean;
}

export interface CreateClientResp extends OidcClient {
  client_secret: string;
}

export interface RotateResp {
  client_id: string;
  client_secret: string;
}

interface Envelope<T> {
  code: number;
  message: string;
  data: T;
}

export async function listClients(service?: string): Promise<OidcClient[]> {
  const qs = service ? `?service=${encodeURIComponent(service)}` : '';
  const env = await apiJson<Envelope<OidcClient[] | null>>(`/v1/clients${qs}`);
  return env.data ?? [];
}

export async function createClient(
  req: CreateClientReq,
): Promise<CreateClientResp> {
  const env = await apiJson<Envelope<CreateClientResp>>('/v1/clients', {
    method: 'POST',
    body: JSON.stringify(req),
  });
  return env.data;
}

export async function rotateSecret(id: number): Promise<RotateResp> {
  const env = await apiJson<Envelope<RotateResp>>(
    `/v1/clients/${id.toString()}/rotate`,
    { method: 'POST' },
  );
  return env.data;
}

export async function deleteClient(id: number): Promise<void> {
  await apiFetch(`/v1/clients/${id.toString()}`, { method: 'DELETE' });
}
