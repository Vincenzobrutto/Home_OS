import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
import {fileURLToPath} from 'node:url';
import {existsSync,lstatSync} from 'node:fs';
import path from 'node:path';
const root=fileURLToPath(new URL('..',import.meta.url));
const cache=path.join(root,'.agency-cache'),out=path.join(cache,'gift-build');
for(const directory of [cache,out])if(existsSync(directory)&&lstatSync(directory).isSymbolicLink())throw Error('gift_preview_cache_must_be_private');
export default defineConfig({root,plugins:[react()],envDir:cache,cacheDir:path.join(cache,'vite-gift-build'),build:{outDir:out,emptyOutDir:true,rollupOptions:{input:path.join(root,'agency-gift-preview.html')}}});
