import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
// Dedicated offline component tests; no runtime server, API, document bytes or shared dependency caches.
export default defineConfig({plugins:[react()],cacheDir:'.agency-cache/vite',test:{environment:'jsdom',setupFiles:['./src/test/setup.ts'],include:['src/agency-plans/*.test.tsx'],maxWorkers:1}});
