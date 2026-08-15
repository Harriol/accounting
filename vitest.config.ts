import { resolve } from 'path';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': resolve('src/renderer/src'),
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.{test,spec}.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary', 'html'],
      include: ['src/renderer/src/**/*.{ts,tsx}', 'src/main/db/**/*.ts'],
      exclude: [
        'src/renderer/src/**/*.d.ts',
        'src/renderer/src/main.tsx',
        '**/*.{test,spec}.{ts,tsx}',
      ],
    },
  },
});
