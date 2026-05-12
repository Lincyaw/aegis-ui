import { viteCommonjs } from '@originjs/vite-plugin-commonjs';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { defineConfig, loadEnv } from 'vite';
import topLevelAwait from 'vite-plugin-top-level-await';
import wasm from 'vite-plugin-wasm';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react(), wasm(), viteCommonjs(), topLevelAwait()],
    assetsInclude: ['**/*.wasm'],
    worker: {
      format: 'es',
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src/apps/portal'),
      },
    },
    server: {
      port: Number(env.VITE_PORT) || 3100,
      proxy: (() => {
        const apiTarget = env.VITE_API_TARGET || 'http://127.0.0.1:8083';
        const ssoTarget = env.VITE_SSO_TARGET || apiTarget;
        const sso = (): { target: string; changeOrigin: true } => ({
          target: ssoTarget,
          changeOrigin: true,
        });
        return {
          '/api': { target: apiTarget, changeOrigin: true, ws: true },
          '/.well-known': sso(),
          '/authorize': sso(),
          '/login': sso(),
          '/token': sso(),
          '/userinfo': sso(),
          '/v1': sso(),
        };
      })(),
    },
    optimizeDeps: {
      exclude: [
        '@finos/perspective',
        '@finos/perspective-viewer',
        '@finos/perspective-viewer-datagrid',
        '@finos/perspective-viewer-d3fc',
      ],
      esbuildOptions: {
        target: 'esnext',
      },
    },
    build: {
      target: 'esnext',
    },
  };
});
