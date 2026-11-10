/// <reference types="vite/client" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3002',
        changeOrigin: true,
      },
    },
  },
  optimizeDeps: {
    include: ['three', '@react-three/fiber', '@react-three/postprocessing'],
    esbuildOptions: {
      target: 'es2020',
    },
  },
  worker: {
    format: 'es',
  },
  build: {
    commonjsOptions: {
      include: [/three/, /node_modules/],
      transformMixedEsModules: true,
    },
    rollupOptions: {
      output: {
        manualChunks: {
          'react-three': ['@react-three/fiber', '@react-three/postprocessing'],
          three: ['three'],
        },
      },
    },
  },
});
