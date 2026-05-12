// Runtime endpoint configuration.
//
// Edit this file at deploy time (or replace it via your container
// orchestrator) without rebuilding the SPA. Anything you set here is
// readable as window.__AEGIS_CONFIG__ before main.tsx loads. Users can
// further override these values at runtime via the in-app Setup page,
// which writes to localStorage.
//
// Leave a field empty / undefined to fall back to same-origin paths
// (gateway is co-located with the SPA, vite proxy in dev).
window.__AEGIS_CONFIG__ = {
  // gatewayUrl: 'https://gateway.example.com',
  // ssoOrigin: 'https://sso.example.com',
  // ssoClientId: 'aegis-console',
  // ssoScope: 'openid profile email',
  // clickhouseUrl: 'http://localhost:8123',
  // clickhouseDatabase: 'otel',
  // clickhouseTracesTable: 'otel_traces',
  // clickhouseUser: 'default',
  // clickhousePassword: '',
};
