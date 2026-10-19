import {ShoppingCart} from '@phosphor-icons/react/dist/csr/ShoppingCart';
import { Link } from 'react-router';
import type { CatalogItem } from '../api/types';
import { useEconomyExpenses } from '../economy/hooks';
import { DEFAULT_FILTERS } from '../lib/economy';
import { formatCents } from '../lib/expenses';
import { ui } from '../components/ui';
import pages from '../routes/pages.module.css';

/** Read the canonical purchases only: never add maintenance costs to the purchase price. */
export function PurchaseSummary({ homeId, object, enabled,compact=false }: { homeId: string; object: CatalogItem; enabled: boolean;compact?:boolean }) {
  const purchases = useEconomyExpenses(homeId, { ...DEFAULT_FILTERS, period: { kind: 'range', from: '0001-01-01', to: '9999-12-31' }, object: object.ref, category: 'purchase_replacement' }, { enabled, limit: 2 });
  if (!enabled) return null;
  if (purchases.isPending) return <p role="status">Caricamento dell’acquisto…</p>;
  if (purchases.isError) return <p>Acquisto non disponibile. <button className={ui.btn} onClick={() => void purchases.refetch()}>Riprova</button></p>;
  const items = purchases.data.pages.flatMap(page => page.items);
  if (!items.length) return null;
  return <section className={compact?undefined:ui.card} aria-label="Acquisto dell’oggetto">{compact&&<ShoppingCart size={26} aria-hidden="true"/>}<h2 className={pages.cardTitle}>{items.length === 1 && !purchases.hasNextPage ? 'Acquisto' : 'Acquisti collegati'}</h2>
    {items.map(item => <p key={item.id}><Link to={`/home/${encodeURIComponent(homeId)}/spese/${encodeURIComponent(item.id)}`}><strong>{formatCents(item.amountCents)}</strong> · {compact?new Intl.DateTimeFormat('it-IT',{day:'numeric',month:'short',year:'numeric',timeZone:'UTC'}).format(new Date(item.spentOn+'T12:00:00Z')):item.spentOn.split('-').reverse().join('/')}{!compact&&<> · {item.title}</>}</Link></p>)}
    {purchases.hasNextPage && <Link to={`/home/${encodeURIComponent(homeId)}/spese?vista=elenco&oggetto=${encodeURIComponent(`${object.ref.kind}:${object.ref.id}`)}`}>Vedi tutti i costi</Link>}
  </section>;
}
