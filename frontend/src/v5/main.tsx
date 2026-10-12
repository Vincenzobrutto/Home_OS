import React from 'react';
import { createRoot } from 'react-dom/client';
import { DimoraV5Preview } from './DimoraV5Preview';

createRoot(document.getElementById('root')!).render(
  <React.StrictMode><DimoraV5Preview /></React.StrictMode>,
);
