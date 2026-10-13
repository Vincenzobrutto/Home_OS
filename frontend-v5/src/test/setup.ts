import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, beforeAll } from 'vitest';
import { blobUrls, downloads, installBrowserStubs } from './browserStubs';

beforeAll(() => {
  installBrowserStubs();
});

afterEach(() => {
  cleanup();
  blobUrls.reset();
  downloads.length = 0;
});
