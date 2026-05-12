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
      port: Number(env.VITE_PORT) || 3323,
      strictPort: true,
      proxy: (() => {
        const target = env.VITE_API_TARGET || 'http://127.0.0.1:8082';
        const opts: { target: string; changeOrigin: true } = {
          target,
          changeOrigin: true,
        };
        return {
          '/api/v2/inbox': { ...opts, ws: true },
          '/api/v2/blob': opts,
          '/api': { ...opts, ws: true },
          '/.well-known': opts,
          '/authorize': opts,
          '/login': opts,
          '/token': opts,
          '/userinfo': opts,
          '/v1': opts,
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
