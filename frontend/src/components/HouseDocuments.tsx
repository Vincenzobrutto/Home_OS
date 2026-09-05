import { useEffect, useState } from 'react';
import { FileText, Search, Trash2 } from 'lucide-react';
import { T } from '../theme';
import { SectionLabel } from './Shared';
import { api } from '../api';
import type { DocumentRecord, House } from '../types';

// Card per i documenti a livello casa (APE, atti, planimetrie...). Gli
// asset senza ambiente (es. impianto elettrico condominiale) vivevano qui
// come sezione separata; ora sono raggruppati nella pagina Asset sotto il
// chip "Documenti casa" (vedi Assets.tsx AssetsView) — questa vista resta
// solo per i documenti che non appartengono a nessun asset.
function HouseCard({
  icon,
  title,
  subtitle,
  fields,
  onClick,
  href,
  onDelete,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  fields?: [string, string][];
  onClick?: () => void;
  href?: string;
  onDelete?: () => void;
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
        {onDelete && (
          <button
            type="button"
            title="Elimina definitivamente documento e file originale"
            onClick={(event) => {
              event.stopPropagation();
              onDelete();
            }}
            style={{ display: 'flex', border: 'none', background: 'none', color: T.rust, cursor: 'pointer', padding: 6 }}
          >
            <Trash2 size={15} />
          </button>
        )}
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

export function HouseDocumentsView({ house }: { house: House }) {
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');

  function loadDocuments() {
    setLoading(true);
    api.documents
      .listForHouse(house.id)
      .then(setDocuments)
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadDocuments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [house.id]);

  async function deleteDocument(document: DocumentRecord) {
    if (
      !window.confirm(
        `Eliminare definitivamente "${document.originalFilename}"? Il file originale verrà cancellato e non sarà recuperabile.`,
      )
    ) {
      return;
    }
    await api.documents.remove(document.id);
    loadDocuments();
  }

  // Documenti confermati esplicitamente "collega alla casa, non a un asset"
  // dall'Inbox (es. APE, certificazione energetica generale) — non impianti
  // fisici, quindi non appartengono a nessun Asset. Vedi START_HERE.md.
  const houseDocs = documents.filter((d) => d.houseLevel && d.status === 'CONFIRMED');

  // Utile quando i documenti diventano tanti: cerca su tutto quello che è
  // già visibile in una card (tipo, filename, singoli campi estratti), non
  // solo sul titolo.
  const q = query.trim().toLowerCase();
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
        Documenti che riguardano la casa nel suo insieme, non un ambiente o un impianto specifico (es. APE, atto, planimetria). Gli impianti senza un ambiente assegnato si trovano nella pagina Asset, sotto il filtro "Documenti casa".
      </div>

      <div style={{ position: 'relative', marginBottom: 26 }}>
        <Search size={14} color={T.slate} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Cerca per tipo di documento o nome file…"
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
            onClick={() => window.open(api.documents.fileUrl(doc.id), '_blank', 'noopener,noreferrer')}
            onDelete={() => void deleteDocument(doc)}
          />
        ))}
      </div>
    </div>
  );
}
