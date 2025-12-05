import { defineConfig } from 'tsup';

export default defineConfig([
  // Main client entry
  {
    entry: ['src/index.ts'],
    format: ['cjs', 'esm'],
    dts: true,
    sourcemap: true,
    clean: true,
    external: ['react', 'react-dom', 'next'],
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
    external: ['react', 'react-dom', 'next'],
  },
  // Plugin for next.config
  {
    entry: ['src/plugin/index.ts'],
    format: ['cjs', 'esm'],
    dts: true,
    sourcemap: true,
    outDir: 'dist/plugin',
    external: ['react', 'react-dom', 'next'],
  },
]);
