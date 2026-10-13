import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider, createBrowserRouter } from 'react-router';
import { ApiClient } from './api/client';
import { routes } from './routes/routes';
import { createQueryClient } from './session/queryClient';
import { AppProviders } from './session/session';
import './styles/tokens.css';
import './styles/global.css';

// Modalità reale: solo il backend V5 via /api/v5. Nessun mock, nessun dato demo.
const api = new ApiClient();
const queryClient = createQueryClient();
const router = createBrowserRouter(routes);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppProviders api={api} queryClient={queryClient}>
      <RouterProvider router={router} />
    </AppProviders>
  </StrictMode>,
);
