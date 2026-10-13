import { Navigate, type RouteObject } from 'react-router';
import { LoginPage, RegisterPage } from './AuthPages';
import { AnonymousOnly, IndexRedirect, RequireAccount, RootLayout } from './guards';
import { CasaPage, HomeLayout, NotFoundPage, SectionNotFound, UnavailableSection } from './HomePages';
import { CreateHomePage, HomesPage } from './HomesPages';

// Mappa delle rotte V5 (prima verticale identity-v1).
// Agenzie e Amministratori non hanno rotte: non sono ancora assegnate.
export const routes: RouteObject[] = [
  {
    element: <RootLayout />,
    children: [
      { index: true, element: <IndexRedirect /> },
      {
        element: <AnonymousOnly />,
        children: [
          { path: 'accedi', element: <LoginPage /> },
          { path: 'registrati', element: <RegisterPage /> },
        ],
      },
      {
        element: <RequireAccount />,
        children: [
          { path: 'case', element: <HomesPage /> },
          { path: 'case/nuova', element: <CreateHomePage /> },
          {
            path: 'home/:homeId',
            element: <HomeLayout />,
            children: [
              { index: true, element: <Navigate to="casa" replace /> },
              { path: 'casa', element: <CasaPage /> },
              { path: 'attivita', element: <UnavailableSection section="attivita" /> },
              { path: 'documenti', element: <UnavailableSection section="documenti" /> },
              { path: 'spese', element: <UnavailableSection section="spese" /> },
              { path: '*', element: <SectionNotFound /> },
            ],
          },
        ],
      },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
];
