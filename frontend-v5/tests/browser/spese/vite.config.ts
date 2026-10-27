import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createHash } from 'node:crypto';
import base from '../../../vite.config';

const project=fileURLToPath(new URL('../../../',import.meta.url));
const require=createRequire(join(project,'package.json'));
export default {
  ...base,
  root:fileURLToPath(new URL('./',import.meta.url)),
  base:'/spese-browser/',
  envDir:fileURLToPath(new URL('./environment/',import.meta.url)),
  cacheDir:join(tmpdir(),'dimora-spese-cache-'+createHash('sha256').update(project).digest('hex').slice(0,12)),
  // Anche un avvio manuale del config non deve inoltrare richieste all'app reale.
  server:{host:'127.0.0.1',port:5197,strictPort:true,proxy:{}},
  preview:{host:'127.0.0.1',port:5197,strictPort:true,proxy:{}},
  resolve:{alias:['react','react/jsx-runtime','react/jsx-dev-runtime','react-dom/client','react-router'].map(name=>({find:new RegExp('^'+name+'$'),replacement:require.resolve(name)}))},
  build:{...base.build,target:'esnext',emptyOutDir:false},
};
