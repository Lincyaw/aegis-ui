/**
 * Client for aegis-sso's /v1/clients admin surface (OIDC client CRUD +
 * secret rotation). Goes through the vite proxy (`/v1/*` is forwarded
 * to the gateway / sso upstream; configure VITE_API_TARGET).
 */
import { apiData, apiFetch } from './apiClient';

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

export async function listClients(service?: string): Promise<OidcClient[]> {
  const qs = service ? `?service=${encodeURIComponent(service)}` : '';
  const data = await apiData<OidcClient[] | null>(`/v1/clients${qs}`);
  return data ?? [];
}

export async function createClient(
  req: CreateClientReq
): Promise<CreateClientResp> {
  return apiData<CreateClientResp>('/v1/clients', {
    method: 'POST',
    body: JSON.stringify(req),
  });
}

export async function rotateSecret(id: number): Promise<RotateResp> {
  return apiData<RotateResp>(`/v1/clients/${id.toString()}/rotate`, {
    method: 'POST',
  });
}

export async function deleteClient(id: number): Promise<void> {
  await apiFetch(`/v1/clients/${id.toString()}`, { method: 'DELETE' });
}
