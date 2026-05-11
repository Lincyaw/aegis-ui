import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';

export default defineConfig({
  plugins: [
    react(),
    dts({
      entryRoot: 'src',
      include: ['src/**/*.ts', 'src/**/*.tsx'],
      tsconfigPath: 'tsconfig.build.json',
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
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
        'react-router-dom',
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
  },
});
