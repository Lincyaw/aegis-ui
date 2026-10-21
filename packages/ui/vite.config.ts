import react from '@vitejs/plugin-react';
import { readFileSync } from 'fs';
import path from 'path';
import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';

const pkg = JSON.parse(
  readFileSync(path.resolve(__dirname, 'package.json'), 'utf8'),
) as {
  dependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
};

const externalPackages = Object.keys({
  ...pkg.dependencies,
  ...pkg.peerDependencies,
});

// Consumers install dependencies themselves, so bundling them would ship a
// second copy (and break singletons like @codemirror/state). Stylesheets stay
// bundled because dist/style.css is the only CSS consumers import.
function isExternal(id: string): boolean {
  if (/\.css(\?|$)/.test(id)) {
    return false;
  }
  return externalPackages.some(
    (name) => id === name || id.startsWith(`${name}/`),
  );
}

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
      external: isExternal,
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
