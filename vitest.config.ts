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
    // vitest 4 在 Windows + Node 22 下默认 forks/threads worker 池会崩溃
    // （worker 读取 undefined.config，报 Cannot read properties of undefined (reading 'config')），
    // 改用 vmThreads 池（进程内 vm 执行，规避该缺陷）。
    pool: 'vmThreads',
    fileParallelism: false,
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
