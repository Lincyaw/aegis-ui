import basicSsl from '@vitejs/plugin-basic-ssl';
import react from '@vitejs/plugin-react';
import fs from 'node:fs';
import path from 'node:path';
import { defineConfig, loadEnv, type Plugin } from 'vite';

const PAGES_OUT_DIR = path.resolve(__dirname, 'dist-pages');

// GitHub Pages serves index.html at the root and 404.html for any other
// path, so the single gallery entry is published under both names.
function galleryPagesIndex(): Plugin {
  return {
    name: 'gallery-pages-index',
    apply: 'build',
    closeBundle() {
      const index = path.join(PAGES_OUT_DIR, 'index.html');
      fs.renameSync(path.join(PAGES_OUT_DIR, 'gallery.html'), index);
      fs.copyFileSync(index, path.join(PAGES_OUT_DIR, '404.html'));
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const pages = mode === 'pages';
  const useHttps = env.VITE_HTTPS !== '0' && !pages;

  return {
    base: pages ? env.VITE_PAGES_BASE || '/aegis-ui/' : '/',
    plugins: [
      react(),
      ...(useHttps ? [basicSsl()] : []),
      ...(pages ? [galleryPagesIndex()] : []),
    ],
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
      esbuildOptions: {
        target: 'esnext',
      },
    },
    ...(pages ? { publicDir: false } : {}),
    build: {
      target: 'esnext',
      sourcemap: pages ? false : 'hidden',
      ...(pages ? { outDir: PAGES_OUT_DIR } : {}),
      rollupOptions: {
        ...(pages ? { input: path.resolve(__dirname, 'gallery.html') } : {}),
        output: {
          manualChunks(id) {
            if (id.includes('hyparquet') || id.includes('workerBundle')) {
              return 'parquet';
            }
            if (id.includes('/node_modules/apache-arrow')) {
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
