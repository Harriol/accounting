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
    // vitest 4 在 Windows + Node 22 下并行执行多文件会崩溃（worker 读取 undefined.config），
    // 串行执行更稳定且本套件规模小，故关闭文件级并行
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
