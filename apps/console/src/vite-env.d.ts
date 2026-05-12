/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_PORT?: string;
  readonly VITE_API_TARGET?: string;
  readonly VITE_SSO_TARGET?: string;
  readonly VITE_SSO_ORIGIN?: string;
  readonly VITE_SSO_CLIENT_ID?: string;
  readonly VITE_SSO_REDIRECT_URI?: string;
  readonly VITE_SSO_SCOPE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
