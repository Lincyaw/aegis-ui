import react from '@vitejs/plugin-react';
import path from 'path';
import zlib from 'node:zlib';
import { defineConfig, type ViteDevServer } from 'vite';
import dts from 'vite-plugin-dts';

// Dual-mode config: `vite` for playground dev, `vite build` for library output.
export default defineConfig(({ command }) => {
  const isBuild = command === 'build';

  return {
    plugins: [
      react(),
      // Vite dev serves uncompressed by default — brutal on slow / remote
      // links. AntD + react + icons together push 10+ MB raw, ~1.5 MB gzipped.
      !isBuild && devGzipPlugin(),
      isBuild &&
        dts({
          entryRoot: 'src',
          include: ['src/**/*.ts', 'src/**/*.tsx'],
          exclude: ['src/playground/**', 'src/main.tsx'],
          tsconfigPath: 'tsconfig.build.json',
        }),
    ].filter(Boolean),
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      port: 3100,
    },
    build: isBuild
      ? {
          target: 'esnext',
          lib: {
            entry: path.resolve(__dirname, 'src/index.ts'),
            formats: ['es', 'cjs'],
            fileName: (format) => (format === 'es' ? 'index.js' : 'index.cjs'),
            cssFileName: 'style',
          },
          rollupOptions: {
            external: [
              'react',
              'react/jsx-runtime',
              'react-dom',
              'antd',
              /^@ant-design\/icons/,
            ],
            output: {
              assetFileNames: (assetInfo) =>
                assetInfo.name === 'style.css'
                  ? 'style.css'
                  : 'assets/[name][extname]',
            },
          },
          sourcemap: true,
          emptyOutDir: true,
        }
      : {
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
        if (!accept.includes('gzip')) return next();

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
