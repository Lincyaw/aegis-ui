import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';

// Dual-mode config: `vite` for playground dev, `vite build` for library output.
export default defineConfig(({ command }) => {
  const isBuild = command === 'build';

  return {
    plugins: [
      react(),
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
