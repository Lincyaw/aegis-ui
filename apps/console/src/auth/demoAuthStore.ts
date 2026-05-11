import type { AegisAuthUser } from '@OperationsPAI/aegis-ui';

export const USER_KEY = 'aegis.console.auth.user';
export const REGISTRY_KEY = 'aegis.console.auth.users';

export interface RegistryRecord {
  id: string;
  name: string;
  email: string;
  password: string;
}

export interface RegisterInput {
  name: string;
  email: string;
  password: string;
}

const SEED: RegistryRecord = {
  id: 'u_demo',
  name: 'Demo User',
  email: 'demo@aegislab.io',
  password: 'demo1234',
};

export function readRegistry(): RegistryRecord[] {
  const raw = window.localStorage.getItem(REGISTRY_KEY);
  if (!raw) {
    const seeded = [SEED];
    window.localStorage.setItem(REGISTRY_KEY, JSON.stringify(seeded));
    return seeded;
  }
  return JSON.parse(raw) as RegistryRecord[];
}

export function writeRegistry(records: RegistryRecord[]): void {
  window.localStorage.setItem(REGISTRY_KEY, JSON.stringify(records));
}

export function readUser(): AegisAuthUser | null {
  const raw = window.localStorage.getItem(USER_KEY);
  if (!raw) {
    return null;
  }
  return JSON.parse(raw) as AegisAuthUser;
}

export function writeUser(user: AegisAuthUser | null): void {
  if (user) {
    window.localStorage.setItem(USER_KEY, JSON.stringify(user));
  } else {
    window.localStorage.removeItem(USER_KEY);
  }
}

export function toAuthUser(record: RegistryRecord): AegisAuthUser {
  return { id: record.id, name: record.name, email: record.email };
}

export async function register(input: RegisterInput): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 200));
  const registry = readRegistry();
  const normalizedEmail = input.email.trim().toLowerCase();
  if (registry.some((r) => r.email.toLowerCase() === normalizedEmail)) {
    throw new Error('An account with that email already exists');
  }
  const record: RegistryRecord = {
    id: `u_${Date.now().toString(36)}`,
    name: input.name,
    email: input.email,
    password: input.password,
  };
  writeRegistry([...registry, record]);
}

export async function requestPasswordReset(_email: string): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 600));
}
