import '@testing-library/jest-dom/vitest';
import { cleanup, configure } from '@testing-library/react';
import { afterEach, beforeAll } from 'vitest';
import { blobUrls, downloads, installBrowserStubs } from './browserStubs';

// Le query findBy attendono fino a 3 s: con molti test in parallelo 1 s non basta.
configure({ asyncUtilTimeout: 3000 });

beforeAll(() => {
  installBrowserStubs();
});

afterEach(() => {
  cleanup();
  blobUrls.reset();
  downloads.length = 0;
});
