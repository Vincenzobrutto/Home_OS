import { Navigate, type RouteObject } from 'react-router';
import { LoginPage, RegisterPage } from './AuthPages';
import { AnonymousOnly, RequireAccount, RootLayout } from './guards';
import { CasaPage, HomeLayout, NotFoundPage, SectionNotFound } from './HomePages';
import { CreateHomePage, HomeEntry, HomesPage } from './HomesPages';
import { DocumentsPage } from './DocumentsPages';
import { DocumentDetailPage } from './DocumentDetailPage';
import { ActivityPage } from './ActivityPage';
import { ReviewPage } from './ReviewPage';
import { BoilerPage } from './BoilerPage';
import { ActivityDetailPage } from './ActivityDetailPage';
import { ExpensesPage } from './ExpensesPage';
import { ExpenseDetailPage } from './ExpenseDetailPage';

// Mappa delle rotte V5: identity-v1.1, documents-v1 (M2), review-v1 (M3/M4, caso Caldaia), activities-v1 (H1), expenses-v1 (H3a).
// Agenzie e Amministratori non hanno rotte: non sono ancora assegnate.
export const routes: RouteObject[] = [
  {
    element: <RootLayout />,
    children: [
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
          // Ingresso: con una sola casa si entra direttamente; /case resta l'elenco esplicito.
          { index: true, element: <HomeEntry /> },
          { path: 'case', element: <HomesPage /> },
          { path: 'case/nuova', element: <CreateHomePage /> },
          {
            path: 'home/:homeId',
            element: <HomeLayout />,
            children: [
              { index: true, element: <Navigate to="casa" replace /> },
              { path: 'casa', element: <CasaPage /> },
              { path: 'attivita', element: <ActivityPage /> },
              { path: 'attivita/:activityId', element: <ActivityDetailPage /> },
              { path: 'review', element: <ReviewPage /> },
              { path: 'impianti/:assetId', element: <BoilerPage /> },
              { path: 'documenti', element: <DocumentsPage /> },
              { path: 'documenti/:documentId', element: <DocumentDetailPage /> },
              { path: 'spese', element: <ExpensesPage /> },
              { path: 'spese/:expenseId', element: <ExpenseDetailPage /> },
              { path: '*', element: <SectionNotFound /> },
            ],
          },
        ],
      },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
];
