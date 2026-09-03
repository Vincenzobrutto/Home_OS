import { useEffect, useRef, useState } from 'react';
import { Search, FileText, User, ShieldCheck, Wrench, Box } from 'lucide-react';
import { T } from '../theme';
import { api } from '../api';
import { ModalShell } from './Modals';
import { searchHouse, type SearchData, type SearchResult, type SearchResultKind } from '../search';

const KIND_META: Record<SearchResultKind, { label: string; icon: typeof Search }> = {
  asset: { label: 'Asset', icon: Box },
  contact: { label: 'Contatti', icon: User },
  document: { label: 'Documenti', icon: FileText },
  warranty: { label: 'Garanzie', icon: ShieldCheck },
  intervention: { label: 'Interventi', icon: Wrench },
};

export function GlobalSearch({
  data,
  onClose,
  openAsset,
  openContact,
  onOpenHouseDocuments,
}: {
  data: SearchData;
  onClose: () => void;
  openAsset: (id: string) => void;
  openContact: (id: string) => void;
  onOpenHouseDocuments: () => void;
}) {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const results = searchHouse(query, data);
  const grouped = (Object.keys(KIND_META) as SearchResultKind[])
    .map((kind) => ({ kind, items: results.filter((r) => r.kind === kind) }))
    .filter((group) => group.items.length > 0);

  function handleSelect(result: SearchResult) {
    onClose();
    if (result.kind === 'asset') {
      openAsset(result.id);
    } else if (result.kind === 'contact') {
      openContact(result.id);
    } else if (result.kind === 'document') {
      const doc = data.documents.find((d) => d.id === result.id);
      if (doc?.assetId) openAsset(doc.assetId);
      else if (doc?.houseLevel) onOpenHouseDocuments();
      else window.open(api.documents.fileUrl(result.id), '_blank');
    } else if (result.kind === 'warranty') {
      const warranty = data.warranties.find((w) => w.id === result.id);
      if (warranty) openAsset(warranty.assetId);
    } else if (result.kind === 'intervention') {
      const intervention = data.interventions.find((i) => i.id === result.id);
      const firstAsset = intervention?.assets[0]?.id;
      if (firstAsset) openAsset(firstAsset);
    }
  }

  return (
    <ModalShell onClose={onClose} width={560}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, border: `1px solid ${T.line}`, borderRadius: 9, padding: '10px 12px', marginBottom: 16 }}>
        <Search size={16} color={T.slate} />
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Cerca documento, Asset, tecnico, garanzia, seriale, fattura…"
          style={{ flex: 1, border: 'none', outline: 'none', background: 'none', fontFamily: "'Inter', sans-serif", fontSize: 14, color: T.ink }}
        />
      </div>

      {query.trim() === '' && (
        <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 12.5, color: T.slate }}>
          Cerca in tutta la casa: documenti, Asset, contatti, garanzie e interventi.
        </div>
      )}
      {query.trim() !== '' && results.length === 0 && (
        <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 12.5, color: T.slate }}>
          Nessun risultato per "{query.trim()}".
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxHeight: '55vh', overflowY: 'auto' }}>
        {grouped.map(({ kind, items }) => {
          const Icon = KIND_META[kind].icon;
          return (
            <div key={kind}>
              <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10.5, letterSpacing: '0.06em', textTransform: 'uppercase', color: T.slate, marginBottom: 6 }}>
                {KIND_META[kind].label}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {items.map((item) => (
                  <button
                    key={`${item.kind}-${item.id}`}
                    onClick={() => handleSelect(item)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      textAlign: 'left',
                      background: 'none',
                      border: 'none',
                      borderRadius: 7,
                      padding: '8px 9px',
                      cursor: 'pointer',
                      fontFamily: "'Inter', sans-serif",
                    }}
                  >
                    <Icon size={15} color={T.slate} />
                    <div>
                      <div style={{ fontSize: 13, color: T.ink, fontWeight: 500 }}>{item.title}</div>
                      <div style={{ fontSize: 11.5, color: T.slate }}>{item.subtitle}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </ModalShell>
  );
}
