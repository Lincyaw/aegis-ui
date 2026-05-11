import react from '@vitejs/plugin-react';
import zlib from 'node:zlib';
import { type ViteDevServer, defineConfig } from 'vite';

export default defineConfig({
  plugins: [react(), devGzipPlugin()],
  server: {
    port: 3100,
  },
  build: {
    target: 'esnext',
  },
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
