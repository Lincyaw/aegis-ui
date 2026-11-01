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
      // Ships src/mdx-modules.d.ts, the `.mdx` module types hosts reference.
      copyDtsFiles: true,
    }),
  ],
  build: {
    target: 'esnext',
    lib: {
      // `vite` is the build-time preset (aegisMdx) that hosts load in their
      // Vite config; `transports` holds the agent connections, kept out of
      // the main entry so it opens none.
      entry: {
        index: path.resolve(__dirname, 'src/index.ts'),
        transports: path.resolve(__dirname, 'src/transports/index.ts'),
        vite: path.resolve(__dirname, 'src/vite.ts'),
      },
      formats: ['es', 'cjs'],
      fileName: (format, entryName) =>
        `${entryName}.${format === 'es' ? 'js' : 'cjs'}`,
      cssFileName: 'style',
    },
    rollupOptions: {
      external: isExternal,
      output: {
        // One file per source module: package.json marks the JS free of
        // side effects, so a consumer's bundler keeps only what it imports.
        preserveModules: true,
        preserveModulesRoot: 'src',
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
