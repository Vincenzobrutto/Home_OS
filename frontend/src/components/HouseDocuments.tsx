import { useEffect, useState } from 'react';
import { FileText, Search } from 'lucide-react';
import { T, ASSET_TYPES, iconForAsset } from '../theme';
import { SectionLabel } from './Shared';
import { api } from '../api';
import type { Asset, DocumentRecord, House } from '../types';

// Stessa "forma" di card per impianti e documenti: prima gli impianti senza
// ambiente usavano le card a griglia della sezione Asset, visivamente molto
// diverse dalle card documento qui sotto — sulla stessa pagina risultava
// incoerente, vedi richiesta utente "uniformare al formato APE".
function HouseCard({
  icon,
  title,
  subtitle,
  fields,
  onClick,
  href,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  fields?: [string, string][];
  onClick?: () => void;
  href?: string;
}) {
  const card = (
    <div
      onClick={onClick}
      style={{ background: T.card, border: `1px solid ${T.line}`, borderRadius: 10, padding: '16px 18px', cursor: onClick || href ? 'pointer' : undefined }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ display: 'flex', flexShrink: 0 }}>{icon}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 13.5, fontWeight: 500, color: T.ink }}>{title}</div>
          <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 11.5, color: T.slate }}>{subtitle}</div>
        </div>
      </div>
      {fields && fields.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 20px', background: T.paper, borderRadius: 7, padding: '10px 14px', marginTop: 12 }}>
          {fields.map(([k, v]) => (
            <div key={k} style={{ fontFamily: "'Inter', sans-serif", fontSize: 12 }}>
              <span style={{ color: T.slate }}>{k}: </span>
              <span style={{ color: T.ink, fontWeight: 500 }}>{v}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
  if (href) {
    return (
      <a href={href} target="_blank" rel="noreferrer" style={{ textDecoration: 'none', color: 'inherit' }}>
        {card}
      </a>
    );
  }
  return card;
}

export function HouseDocumentsView({
  house,
  assets,
  openAsset,
  onAddAsset,
}: {
  house: House;
  // Asset senza un ambiente specifico (roomId nullo, es. "Impianto
  // elettrico"): non sono impianti di una stanza ma di tutta la casa, quindi
  // si gestiscono qui invece che nella sezione Asset generale — vedi scelta
  // utente: restano SOLO qui, non anche nella griglia Asset.
  assets: Asset[];
  openAsset: (id: string) => void;
  onAddAsset: () => void;
}) {
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');

  useEffect(() => {
    setLoading(true);
    api.documents
      .listForHouse(house.id)
      .then(setDocuments)
      .finally(() => setLoading(false));
  }, [house.id]);

  // Documenti confermati esplicitamente "collega alla casa, non a un asset"
  // dall'Inbox (es. APE, certificazione energetica generale) — non impianti
  // fisici, quindi non appartengono a nessun Asset. Vedi START_HERE.md.
  const houseDocs = documents.filter((d) => d.houseLevel && d.status === 'CONFIRMED');
  const houseAssets = assets.filter((a) => !a.roomId && !a.dismissedAt);

  // Utile quando i documenti/impianti diventano tanti: cerca su tutto
  // quello che è già visibile in una card (nome, codice, tipo, filename,
  // e i singoli campi estratti/dati aggiuntivi), non solo sul titolo — così
  // "de'longhi" trova la macchina del caffè anche se non è nel nome.
  const q = query.trim().toLowerCase();
  const filteredAssets = houseAssets.filter((a) => {
    if (!q) return true;
    const meta = ASSET_TYPES[a.type];
    const haystack = [a.name, a.code, meta.label, ...(a.customFields ?? []).flatMap((f) => [f.label, f.value])]
      .join(' ')
      .toLowerCase();
    return haystack.includes(q);
  });
  const filteredDocs = houseDocs.filter((d) => {
    if (!q) return true;
    const fields = d.extractedFields?.kind === 'asset_document' ? d.extractedFields.fields : [];
    const haystack = [d.docType, d.originalFilename, ...fields.flatMap(([k, v]) => [k, v])]
      .join(' ')
      .toLowerCase();
    return haystack.includes(q);
  });

  return (
    <div style={{ padding: '36px 44px', maxWidth: 820 }}>
      <SectionLabel>{house.code}</SectionLabel>
      <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: 26, color: T.ink, margin: '0 0 6px 0' }}>
        Documenti casa
      </h1>
      <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: T.slate, marginBottom: 20 }}>
        Impianti e documenti che riguardano la casa nel suo insieme e non un ambiente specifico.
      </div>

      <div style={{ position: 'relative', marginBottom: 26 }}>
        <Search size={14} color={T.slate} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Cerca per nome, marca, modello, tipo di documento…"
          style={{
            width: '100%',
            boxSizing: 'border-box',
            padding: '9px 12px 9px 34px',
            borderRadius: 8,
            border: `1px solid ${T.line}`,
            background: T.card,
            fontFamily: "'Inter', sans-serif",
            fontSize: 13,
            color: T.ink,
            outline: 'none',
          }}
        />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <SectionLabel>Impianti senza ambiente specifico</SectionLabel>
        <button
          onClick={onAddAsset}
          style={{ background: 'none', border: 'none', color: T.pine, cursor: 'pointer', fontFamily: "'Inter', sans-serif", fontSize: 12, fontWeight: 500, padding: 0 }}
        >
          + Aggiungi asset
        </button>
      </div>

      {filteredAssets.length === 0 ? (
        <div style={{ border: `1px dashed ${T.line}`, borderRadius: 10, padding: '20px 16px', textAlign: 'center', color: T.slate, fontFamily: "'Inter', sans-serif", fontSize: 13, marginBottom: 34 }}>
          {houseAssets.length === 0 ? 'Nessun impianto senza ambiente specifico.' : `Nessun impianto trovato per "${query.trim()}".`}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 34 }}>
          {filteredAssets.map((a) => {
            const meta = ASSET_TYPES[a.type];
            const Icon = iconForAsset(a);
            return (
              <HouseCard
                key={a.id}
                icon={<Icon size={17} color={meta.color} />}
                title={a.name}
                subtitle={`${a.code} · ${meta.label} · ${a.customFields?.length ?? 0} dati aggiuntivi`}
                onClick={() => openAsset(a.id)}
              />
            );
          })}
        </div>
      )}

      <div style={{ marginBottom: 12 }}>
        <SectionLabel>Documenti generali (APE, certificazioni, ecc.)</SectionLabel>
      </div>

      {!loading && filteredDocs.length === 0 && (
        <div
          style={{
            border: `1px dashed ${T.line}`,
            borderRadius: 10,
            padding: '50px 20px',
            textAlign: 'center',
            color: T.slate,
            fontFamily: "'Inter', sans-serif",
            fontSize: 13.5,
          }}
        >
          {houseDocs.length === 0
            ? 'Nessun documento collegato alla casa. Dall\'Inbox, dopo l\'analisi AI di un documento, scegli "Collega alla casa, non a un asset" per i documenti che non riguardano un impianto specifico.'
            : `Nessun documento trovato per "${query.trim()}".`}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {filteredDocs.map((doc) => (
          <HouseCard
            key={doc.id}
            icon={<FileText size={17} color={T.slate} />}
            title={doc.docType ?? doc.originalFilename}
            subtitle={`${doc.originalFilename} · confermato ${doc.confirmedAt ? new Date(doc.confirmedAt).toLocaleDateString('it-IT') : ''}`}
            fields={doc.extractedFields?.kind === 'asset_document' ? doc.extractedFields.fields : undefined}
            href={api.documents.fileUrl(doc.id)}
          />
        ))}
      </div>
    </div>
  );
}
