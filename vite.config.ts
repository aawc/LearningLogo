import { defineConfig } from 'vite';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const appVersion = process.env.VITE_APP_VERSION || '1.0.0';

export default defineConfig({
  base: './',
  define: {
    __APP_VERSION__: JSON.stringify(appVersion),
  },
  plugins: [
    {
      name: 'inject-sw-version',
      closeBundle() {
        const swPath = resolve(__dirname, 'dist/sw.js');
        if (existsSync(swPath)) {
          let content = readFileSync(swPath, 'utf-8');
          content = content.replace(/__APP_VERSION__/g, appVersion);
          writeFileSync(swPath, content, 'utf-8');
        }
      },
    },
  ],
  build: {
    target: 'es2022',
    assetsInlineLimit: 4096,
    rollupOptions: {
      output: {
        manualChunks: undefined,
      },
    },
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    allowedHosts: true,
    watch: {
      usePolling: true,
      interval: 200,
      ignored: ['**/dist/**', '**/.git/**', '**/node_modules/**'],
    },
  },
});
