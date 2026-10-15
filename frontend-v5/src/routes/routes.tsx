import { Navigate, type RouteObject } from 'react-router';
import { LoginPage, RegisterPage } from './AuthPages';
import { AnonymousOnly, RequireAccount, RootLayout } from './guards';
import { CasaPage, HomeLayout, NotFoundPage, SectionNotFound } from './HomePages';
import { CreateHomePage, HomeEntry, HomesPage } from './HomesPages';
import { lazyPage } from './lazyPage';

// Sezioni a caricamento differito: definite una volta qui, fuori dal rendering.
const DocumentsPage = lazyPage(() => import('./DocumentsPages').then((m) => m.DocumentsPage));
const DocumentDetailPage = lazyPage(() => import('./DocumentDetailPage').then((m) => m.DocumentDetailPage));
const ActivityPage = lazyPage(() => import('./ActivityPage').then((m) => m.ActivityPage));
const ActivityDetailPage = lazyPage(() => import('./ActivityDetailPage').then((m) => m.ActivityDetailPage));
const ReviewPage = lazyPage(() => import('./ReviewPage').then((m) => m.ReviewPage));
const BoilerPage = lazyPage(() => import('./BoilerPage').then((m) => m.BoilerPage));
const ExpensesPage = lazyPage(() => import('./SpesePage').then((m) => m.ExpensesPage));
const ExpenseDetailRoute = lazyPage(() => import('./EconomyExpensePage').then((m) => m.ExpenseDetailRoute));
const WorksPage = lazyPage(() => import('./WorksPages').then((m) => m.WorksPage));
const WorkDetailPage = lazyPage(() => import('./WorksPages').then((m) => m.WorkDetailPage));
const FromDocumentPage = lazyPage(() => import('./DocumentDraftPages').then((m) => m.FromDocumentPage));
const AnalysisJobPage = lazyPage(() => import('./DocumentDraftPages').then((m) => m.AnalysisJobPage));
const DraftsPage = lazyPage(() => import('./DocumentDraftPages').then((m) => m.DraftsPage));
const DraftPage = lazyPage(() => import('./DocumentDraftPages').then((m) => m.DraftPage));
const RoomsPage = lazyPage(() => import('./RoomsPages').then((m) => m.RoomsPage));
const RoomDetailPage = lazyPage(() => import('./RoomsPages').then((m) => m.RoomDetailPage));
const ObjectsPage = lazyPage(() => import('./ObjectsPages').then((m) => m.ObjectsPage));
const ObjectDetailPage = lazyPage(() => import('./ObjectsPages').then((m) => m.ObjectDetailPage));
const SharesPage = lazyPage(() => import('./SharingPages').then((m) => m.SharesPage));
const NewSharePage = lazyPage(() => import('./SharingPages').then((m) => m.NewSharePage));
const ShareDetailPage = lazyPage(() => import('./SharingPages').then((m) => m.ShareDetailPage));
const ReceivedListPage = lazyPage(() => import('./ReceivedPages').then((m) => m.ReceivedListPage));
const ClaimCodePage = lazyPage(() => import('./ReceivedPages').then((m) => m.ClaimCodePage));
const ReceivedDetailPage = lazyPage(() => import('./ReceivedPages').then((m) => m.ReceivedDetailPage));

// Mappa delle rotte V5: identity-v1.1, documents-v1 (M2), review-v1 (M3/M4, caso Caldaia), activities-v1 (H1), expenses-v1 (H3a), home-objects-v1 (G1), economy-v1 (S1a/b, con ripiego H3a).
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
          // sharing-v1: consegne ricevute a livello account, anche senza case.
          { path: 'consegne', element: <ReceivedListPage /> },
          { path: 'consegne/codice', element: <ClaimCodePage /> },
          { path: 'consegne/:shareId', element: <ReceivedDetailPage /> },
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
              { path: 'spese/da-documento', element: <FromDocumentPage /> },
              { path: 'spese/analisi/:jobId', element: <AnalysisJobPage /> },
              { path: 'spese/bozze', element: <DraftsPage /> },
              { path: 'spese/bozze/:draftId', element: <DraftPage /> },
              { path: 'spese/lavori', element: <WorksPage /> },
              { path: 'spese/lavori/:workId', element: <WorkDetailPage /> },
              { path: 'spese/:expenseId', element: <ExpenseDetailRoute /> },
              { path: 'ambienti', element: <RoomsPage /> },
              { path: 'ambienti/:roomId', element: <RoomDetailPage /> },
              { path: 'oggetti', element: <ObjectsPage /> },
              { path: 'oggetti/:kind/:objectId', element: <ObjectDetailPage /> },
              { path: 'condivisioni', element: <SharesPage /> },
              { path: 'condivisioni/nuova', element: <NewSharePage /> },
              { path: 'condivisioni/:shareId', element: <ShareDetailPage /> },
              { path: '*', element: <SectionNotFound /> },
            ],
          },
        ],
      },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
];
