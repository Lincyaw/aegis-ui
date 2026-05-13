/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_PORT?: string;
  readonly VITE_API_TARGET?: string;
  readonly VITE_SSO_ORIGIN?: string;
  readonly VITE_SSO_CLIENT_ID?: string;
  readonly VITE_SSO_REDIRECT_URI?: string;
  readonly VITE_SSO_SCOPE?: string;
  readonly VITE_AGENTM_GATEWAY_URL?: string;
  readonly VITE_AGENTM_TOKEN?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
