import type {
  AegisAppEnvironmentsConfig,
  EnvironmentBadge,
  EnvironmentDescriptor,
  EnvironmentManifest,
} from '@lincyaw/aegis-ui';

const DISCOVERY_PATH = '/.well-known/aegis-environments.json';
const BADGES: readonly EnvironmentBadge[] = [
  'default',
  'info',
  'warning',
  'danger',
];

/**
 * The environments a backend declares at
 * `<apiBaseUrl>/.well-known/aegis-environments.json`. A backend without
 * the manifest reports a single production environment at `apiBaseUrl`.
 */
export function wellKnownEnvironments(
  apiBaseUrl: string
): AegisAppEnvironmentsConfig {
  const url = `${apiBaseUrl.replace(/\/+$/, '')}${DISCOVERY_PATH}`;
  return {
    load: (signal) => loadEnvironmentManifest(url, signal),
    fallback: {
      id: 'prod',
      label: 'Production',
      baseUrl: apiBaseUrl,
      badge: 'default',
    },
  };
}

/** Resolves null when `url` is not found; rejects with the reason otherwise. */
async function loadEnvironmentManifest(
  url: string,
  signal: AbortSignal
): Promise<EnvironmentManifest | null> {
  let response: Response;
  try {
    response = await fetch(url, {
      headers: { Accept: 'application/json' },
      credentials: 'omit',
      signal,
    });
  } catch (error) {
    if (signal.aborted) {
      throw error;
    }
    throw new Error(`Could not reach ${url}: ${errorMessage(error)}`);
  }
  if (response.status === 404) {
    return null;
  }
  if (!response.ok) {
    throw new Error(`${url} answered HTTP ${response.status}.`);
  }
  let body: unknown;
  try {
    body = await response.json();
  } catch (error) {
    throw new Error(`${url} is not JSON: ${errorMessage(error)}`);
  }
  return parseEnvironmentManifest(body, url);
}

function parseEnvironmentManifest(
  input: unknown,
  source: string
): EnvironmentManifest {
  const fail = (reason: string): never => {
    throw new Error(`${source} is not an environment manifest: ${reason}.`);
  };
  if (!isRecord(input)) {
    return fail('expected an object');
  }
  const { default: defaultId, environments } = input;
  if (typeof defaultId !== 'string' || defaultId === '') {
    return fail('"default" must be a non-empty string');
  }
  if (!Array.isArray(environments) || environments.length === 0) {
    return fail('"environments" must be a non-empty array');
  }
  const parsed = environments.map((item: unknown, index) =>
    parseEnvironment(item, (reason) => fail(`environments[${index}] ${reason}`))
  );
  if (!parsed.some((env) => env.id === defaultId)) {
    return fail(`"default" names "${defaultId}", which is not listed`);
  }
  return { default: defaultId, environments: parsed };
}

function parseEnvironment(
  item: unknown,
  fail: (reason: string) => never
): EnvironmentDescriptor {
  if (!isRecord(item)) {
    return fail('must be an object');
  }
  const text = (name: string): string => {
    const value = item[name];
    return typeof value === 'string' && value !== ''
      ? value
      : fail(`"${name}" must be a non-empty string`);
  };
  const { badge } = item;
  if (badge !== undefined && !isBadge(badge)) {
    return fail(`"badge" must be one of ${BADGES.join(', ')}`);
  }
  return {
    id: text('id'),
    label: text('label'),
    baseUrl: text('baseUrl'),
    badge,
  };
}

function isBadge(value: unknown): value is EnvironmentBadge {
  return BADGES.some((badge) => badge === value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
