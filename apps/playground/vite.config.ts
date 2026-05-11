import { viteCommonjs } from '@originjs/vite-plugin-commonjs';
import react from '@vitejs/plugin-react';
import zlib from 'node:zlib';
import path from 'node:path';
import { type ViteDevServer, defineConfig, loadEnv } from 'vite';
import topLevelAwait from 'vite-plugin-top-level-await';
import wasm from 'vite-plugin-wasm';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react(), wasm(), viteCommonjs(), topLevelAwait(), devGzipPlugin()],
    assetsInclude: ['**/*.wasm'],
    worker: {
      format: 'es',
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src/playground/apps/portal'),
      },
    },
    server: {
      port: Number(env.VITE_PORT) || 3100,
      proxy: {
        '/api': {
          target: env.VITE_API_TARGET || 'http://127.0.0.1:8083',
          changeOrigin: true,
          ws: true,
        },
      },
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

function devGzipPlugin() {
  return {
    name: 'aegis-dev-gzip',
    apply: 'serve' as const,
    configureServer(server: ViteDevServer) {
      server.middlewares.use((req, res, next) => {
        const accept = String(req.headers['accept-encoding'] ?? '');
        if (!accept.includes('gzip')) {
          return next();
        }

        const origWrite = res.write.bind(res);
        const origEnd = res.end.bind(res);
        const origWriteHead = res.writeHead.bind(res);
        const chunks: Buffer[] = [];
        let intercept = false;

        res.writeHead = ((...args: Parameters<typeof res.writeHead>) => {
          const ct = String(res.getHeader('content-type') ?? '');
          if (
            ct.startsWith('text/') ||
            ct.includes('javascript') ||
            ct.includes('json') ||
            ct.includes('css') ||
            ct.includes('xml') ||
            ct.includes('svg')
          ) {
            intercept = true;
            res.removeHeader('Content-Length');
          }
          return origWriteHead(...args);
        }) as typeof res.writeHead;

        res.write = ((chunk: unknown, ...rest: unknown[]) => {
          if (intercept && chunk != null) {
            chunks.push(
              Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk)),
            );
            return true;
          }
          return origWrite(chunk as never, ...(rest as []));
        }) as typeof res.write;

        res.end = ((chunk?: unknown, ...rest: unknown[]) => {
          if (intercept) {
            if (chunk != null) {
              chunks.push(
                Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk)),
              );
            }
            const body = Buffer.concat(chunks);
            zlib.gzip(body, { level: 6 }, (err, gz) => {
              if (err) {
                origEnd(body);
                return;
              }
              res.setHeader('Content-Encoding', 'gzip');
              res.setHeader('Content-Length', gz.length);
              origEnd(gz);
            });
            return res;
          }
          return origEnd(chunk as never, ...(rest as []));
        }) as typeof res.end;

        next();
      });
    },
  };
}
