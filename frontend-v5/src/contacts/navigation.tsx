import { Link, useLocation, type Location } from 'react-router';
import { useAccount } from '../session/session';

type ContactOrigin = { path: string; label: string; returnState?: unknown };
type ContactState = { contactsAccountId: string; contactsOrigin: ContactOrigin };

function validPath(path: string, homeId: string) {
  const prefix = '/home/' + encodeURIComponent(homeId) + '/';
  if (!path.startsWith(prefix) || path.includes('\\') || path.includes('#') || [...path].some(c => c.charCodeAt(0) < 32)) return false;
  const route = path.slice(prefix.length).split('?')[0] ?? '';
  return /^(casa|documenti|attivita|spese|review|ambienti|oggetti|rubrica)(\/[A-Za-z0-9_-]+)*$/.test(route);
}

export function contactOrigin(state: unknown, accountId: string, homeId: string): ContactOrigin | null {
  const value = state as Partial<ContactState> | null;
  const origin = value?.contactsOrigin;
  if (value?.contactsAccountId !== accountId || typeof origin?.path !== 'string' || typeof origin.label !== 'string' || !validPath(origin.path, homeId)) return null;
  const label = origin.label.trim().slice(0, 120);
  return label ? { path: origin.path, label, returnState: origin.returnState } : null;
}

export function contactNavigationState(accountId: string, homeId: string, location: Pick<Location, 'pathname' | 'search' | 'state'>): ContactState | undefined {
  const path = location.pathname + location.search;
  if (!validPath(path, homeId)) return undefined;
  const route = location.pathname.slice(('/home/' + encodeURIComponent(homeId) + '/').length).split('/');
  // Navigare di nuovo sulla Rubrica non deve sostituire la provenienza con sé stessa.
  if (route[0] === 'rubrica' && route.length > 1) {
    const origin = contactOrigin(location.state, accountId, homeId);
    return origin ? { contactsAccountId: accountId, contactsOrigin: origin } : undefined;
  }
  const labels: Record<string, string> = { casa: 'Casa', documenti: route.length > 1 ? 'Documento' : 'Documenti', oggetti: route.length > 1 ? 'Oggetto' : 'Oggetti e impianti', ambienti: 'Ambienti', spese: route.length > 1 ? 'Spesa' : 'Spese', attivita: 'Attività', review: 'Analisi e verifiche', rubrica: 'Rubrica' };
  return { contactsAccountId: accountId, contactsOrigin: { path, label: labels[route[0] ?? ''] ?? 'Casa', returnState: location.state } };
}

export function useContactNavigationState(homeId: string) {
  return contactNavigationState(useAccount().id, homeId, useLocation());
}

export function ContactsBackLink({ homeId, detail = false }: { homeId: string; detail?: boolean }) {
  const account = useAccount(), location = useLocation();
  const origin = contactOrigin(location.state, account.id, homeId);
  const fallback = '/home/' + encodeURIComponent(homeId) + (detail ? '/rubrica' : '/casa');
  return <Link to={origin?.path ?? fallback} state={origin?.returnState}>← {origin?.label ?? (detail ? 'Rubrica' : 'Casa')}</Link>;
}
