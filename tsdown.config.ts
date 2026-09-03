import { defineConfig } from 'tsdown';

export default defineConfig([
  // Main client entry
  {
    entry: ['src/index.ts'],
    format: ['cjs', 'esm'],
    dts: true,
    sourcemap: true,
    clean: true,
    deps: { neverBundle: ['react', 'react-dom', 'next'] },
    banner: {
      js: '"use client";',
    },
  },
  // Server utilities
  {
    entry: ['src/server/index.ts'],
    format: ['cjs', 'esm'],
    dts: true,
    sourcemap: true,
    outDir: 'dist/server',
    deps: { neverBundle: ['react', 'react-dom', 'next'] },
  },
  // Plugin for next.config
  {
    entry: ['src/plugin/index.ts'],
    format: ['cjs', 'esm'],
    dts: true,
    sourcemap: true,
    outDir: 'dist/plugin',
    deps: { neverBundle: ['react', 'react-dom', 'next'] },
  },
]);
