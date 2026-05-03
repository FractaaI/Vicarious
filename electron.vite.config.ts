import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig, externalizeDepsPlugin } from 'electron-vite';
import { resolve } from 'node:path';

export default defineConfig(() => {
  return {
    main: {
      plugins: [externalizeDepsPlugin()],
    },
    preload: {
      plugins: [externalizeDepsPlugin()],
    },
    renderer: {
      root: 'src/renderer',
      plugins: [react(), tailwindcss()],
      resolve: {
        alias: {
          '@': resolve(__dirname, 'src/renderer/src'),
        },
      },
      server: {
        // HMR can be disabled with DISABLE_HMR for development environments where file watching is noisy.
        // Do not modify - file watching is disabled to prevent flickering during agent edits.
        hmr: process.env.DISABLE_HMR !== 'true',
      },
    },
  };
});
