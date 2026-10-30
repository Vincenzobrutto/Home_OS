import {defineConfig} from 'vitest/config';
import react from '@vitejs/plugin-react';
export default defineConfig({plugins:[react()],cacheDir:'.agency-cache/review-vite',test:{environment:'jsdom',setupFiles:['./src/test/setup.ts'],include:['src/agency-review/*.test.tsx'],maxWorkers:1}});
