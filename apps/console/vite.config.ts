import { viteCommonjs } from '@originjs/vite-plugin-commonjs';
import basicSsl from '@vitejs/plugin-basic-ssl';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { defineConfig, loadEnv } from 'vite';
import topLevelAwait from 'vite-plugin-top-level-await';
import wasm from 'vite-plugin-wasm';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const useHttps = env.VITE_HTTPS !== '0';

  return {
    plugins: [
      react(),
      wasm(),
      viteCommonjs(),
      topLevelAwait(),
      ...(useHttps ? [basicSsl()] : []),
    ],
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
        const clickhouseTarget =
          env.VITE_CLICKHOUSE_TARGET || 'http://127.0.0.1:8123';
        const opts: { target: string; changeOrigin: true } = {
          target,
          changeOrigin: true,
        };
        return {
          '/api/v2/inbox': { ...opts, ws: true },
          '/api/v2/blob': opts,
          '/api/v2/clickhouse': {
            target: clickhouseTarget,
            changeOrigin: true,
            rewrite: (p: string) => p.replace(/^\/api\/v2\/clickhouse/, ''),
          },
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
      sourcemap: 'hidden',
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('hyparquet') || id.includes('workerBundle')) {
              return 'parquet';
            }
            if (
              id.includes('/node_modules/echarts') ||
              id.includes('/node_modules/echarts-for-react') ||
              id.includes('/node_modules/zrender')
            ) {
              return 'echarts';
            }
            if (
              id.includes('/node_modules/reactflow') ||
              id.includes('/node_modules/@reactflow/')
            ) {
              return 'reactflow';
            }
            if (
              id.includes('/node_modules/apache-arrow') ||
              id.includes('/node_modules/arrow-js-ffi')
            ) {
              return 'arrow';
            }
            if (
              id.includes('/node_modules/react/') ||
              id.includes('/node_modules/react-dom/') ||
              id.includes('/node_modules/react-router-dom/') ||
              id.includes('/node_modules/react-router/')
            ) {
              return 'react';
            }
            if (
              id.includes('/node_modules/antd/') ||
              id.includes('/node_modules/@rc-component/') ||
              id.includes('/node_modules/@ant-design/')
            ) {
              return 'antd';
            }
            return undefined;
          },
        },
      },
    },
  };
});
