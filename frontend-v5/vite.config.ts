/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import {pdfAssets} from './scripts/pdfAssets';
import {ocrAssets} from './scripts/ocrAssets';

// Frontend V5 solo su loopback, porta fissa (strictPort): se 5174 è occupata
// Vite si ferma invece di scegliere un'altra porta.
// /api/v5 è inoltrato al backend V5 di Codex su 127.0.0.1:3001.
// changeOrigin resta false: il server vede Host/Origin del frontend
// (127.0.0.1:5174) per i propri controlli Origin/CSRF.
// DIMORA_API_TARGET serve solo per l'harness con backend simulato (scripts/mock-api.ts, porta 3101).
const API_TARGET = process.env.DIMORA_API_TARGET ?? 'http://127.0.0.1:3001';

export default defineConfig({
  plugins: [react(),pdfAssets(),ocrAssets()],
  server: {
    host: '127.0.0.1',
    port: 5174,
    strictPort: true,
    proxy: {
      '/api/v5': { target: API_TARGET, changeOrigin: false },
    },
  },
  preview: {
    host: '127.0.0.1',
    port: 5174,
    strictPort: true,
    proxy: {
      '/api/v5': { target: API_TARGET, changeOrigin: false },
    },
  },
  build: {
    sourcemap: true,
  },
  test: {
    projects: [
      {
        extends: true,
        test: {
          // Prove con backend simulato (mock): contratto e rendering, NON integrazione reale.
          name: 'mock',
          environment: 'jsdom',
          setupFiles: ['./src/test/setup.ts'],
          include: ['src/**/*.test.{ts,tsx}'],
          restoreMocks: true,
          // Flussi UI completi (analisi, polling, conferme) superano i 5 s predefiniti sotto carico.
          testTimeout: 20_000,
        },
      },
      {
        // Integrità dei PDF di esempio M3 e riconoscimento sui byte reali (Node, nessuna rete).
        test: {
          name: 'fixtures',
          environment: 'node',
          include: ['tests/fixtures/**/*.test.ts'],
        },
      },
      {
        // Prove contro il backend V5 reale: richiedono V5_API_URL, altrimenti saltate.
        test: {
          name: 'integration',
          environment: 'node',
          include: ['tests/integration/**/*.int.test.ts'],
        },
      },
    ],
  },
});
