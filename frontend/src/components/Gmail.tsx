import { useEffect, useState } from 'react';
import { CheckCircle2, FileText, Mail, RefreshCw, XCircle } from 'lucide-react';
import { T } from '../theme';
import { SectionLabel, Stamp } from './Shared';
import { api } from '../api';
import type { GmailCandidate, GmailScanResult, GmailStatus } from '../types';

export function GmailView({
  houseId,
  userId,
  onCandidatesChanged,
  notice,
  onNoticeShown,
  hideHeader,
}: {
  houseId: string;
  userId: string;
  onCandidatesChanged: () => void;
  notice?: 'connected' | 'error' | null;
  onNoticeShown?: () => void;
  hideHeader?: boolean;
}) {
  const [status, setStatus] = useState<GmailStatus | null>(null);
  const [candidates, setCandidates] = useState<GmailCandidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [scanMonths, setScanMonths] = useState(24);
  const [scanResult, setScanResult] = useState<GmailScanResult | null>(null);
  const [busyIds, setBusyIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    const [statusData, candidatesData] = await Promise.all([
      api.gmail.status(userId),
      api.documents.gmailCandidates(houseId),
    ]);
    setStatus(statusData);
    setCandidates(candidatesData);
  }

  useEffect(() => {
    refresh().finally(() => setLoading(false));
  }, [houseId, userId]);

  async function scan() {
    setScanning(true);
    setError(null);
    setScanResult(null);
    try {
      const result = await api.gmail.scan(houseId, userId, scanMonths);
      setScanResult(result);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore imprevisto');
    } finally {
      setScanning(false);
    }
  }

  async function disconnect() {
    if (!window.confirm('Scollegare l\'account Gmail? Le scansioni future non troveranno più nuovi documenti finché non lo ricolleghi.')) {
      return;
    }
    await api.gmail.disconnect(userId);
    setScanResult(null);
    await refresh();
  }

  async function importCandidate(id: string) {
    setBusyIds((prev) => new Set(prev).add(id));
    setError(null);
    try {
      await api.documents.importCandidate(id);
      await refresh();
      onCandidatesChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore imprevisto');
    } finally {
      setBusyIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  }

  async function ignoreCandidate(id: string) {
    setBusyIds((prev) => new Set(prev).add(id));
    setError(null);
    try {
      await api.documents.ignoreDocument(id);
      await refresh();
      onCandidatesChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore imprevisto');
    } finally {
      setBusyIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  }

  if (loading) {
    return <div style={{ padding: hideHeader ? 0 : '36px 44px', fontFamily: "'Inter', sans-serif", color: T.slate }}>Caricamento…</div>;
  }

  return (
    <div style={hideHeader ? undefined : { padding: '36px 44px', maxWidth: 820 }}>
      {!hideHeader && (
        <>
          <SectionLabel>Acquisizione documenti</SectionLabel>
          <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: 26, color: T.ink, margin: '0 0 26px' }}>
            Gmail
          </h1>
        </>
      )}

      {error && <div style={{ color: T.rust, fontFamily: "'Inter', sans-serif", fontSize: 12.5, marginBottom: 16 }}>{error}</div>}

      {notice && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 10,
            background: notice === 'connected' ? '#EEF2EC' : '#FBEAE5',
            border: `1px solid ${notice === 'connected' ? T.pine : T.rust}`,
            borderRadius: 7,
            padding: '9px 14px',
            marginBottom: 20,
            fontFamily: "'Inter', sans-serif",
            fontSize: 12.5,
            color: T.ink,
          }}
        >
          <span>
            {notice === 'connected'
              ? 'Account Gmail collegato correttamente.'
              : "Non è stato possibile collegare l'account Gmail. Verifica la configurazione (GOOGLE_CLIENT_ID/SECRET/REDIRECT_URI) nel backend."}
          </span>
          <button
            onClick={onNoticeShown}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: T.slate, display: 'flex' }}
          >
            <XCircle size={14} />
          </button>
        </div>
      )}

      {!status?.connected ? (
        <div style={{ background: T.card, border: `1px solid ${T.line}`, borderRadius: 10, padding: '24px 22px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
            <Mail size={20} color={T.slate} />
            <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 14, fontWeight: 500, color: T.ink }}>
              Nessun account Gmail collegato
            </div>
          </div>
          <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 12.5, color: T.ink70, marginBottom: 18, lineHeight: 1.5 }}>
            Collegando Gmail (accesso in sola lettura) puoi scansionare la mail (finestra di storico a tua scelta, da 2 a 24 mesi) per trovare fatture, ordini e
            documenti utili al censimento degli asset. Ogni documento trovato va approvato singolarmente prima di entrare in Inbox.
          </div>
          <a
            href={api.gmail.connectUrl(userId)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              background: T.pine,
              color: '#F7F7F2',
              border: 'none',
              borderRadius: 7,
              padding: '9px 15px',
              cursor: 'pointer',
              fontFamily: "'Inter', sans-serif",
              fontSize: 13,
              fontWeight: 500,
              textDecoration: 'none',
            }}
          >
            <Mail size={15} /> Collega Gmail
          </a>
        </div>
      ) : (
        <>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, background: T.card, border: `1px solid ${T.line}`, borderRadius: 10, padding: '16px 18px', marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Mail size={17} color={T.pine} />
              <div>
                <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 500, color: T.ink }}>{status.email}</div>
                <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 11.5, color: T.slate }}>Collegato · sola lettura</div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <select
                value={scanMonths}
                onChange={(e) => setScanMonths(Number(e.target.value))}
                disabled={scanning}
                style={{ fontFamily: "'Inter', sans-serif", fontSize: 12.5, padding: '8px 10px', borderRadius: 6, border: `1px solid ${T.line}`, background: T.card, color: T.ink }}
              >
                <option value={2}>Ultimi 2 mesi</option>
                <option value={6}>Ultimi 6 mesi</option>
                <option value={12}>Ultimi 12 mesi</option>
                <option value={18}>Ultimi 18 mesi</option>
                <option value={24}>Ultimi 24 mesi</option>
              </select>
              <button
                onClick={scan}
                disabled={scanning}
                style={{ display: 'flex', alignItems: 'center', gap: 6, background: T.pine, color: '#F7F7F2', border: 'none', borderRadius: 6, padding: '8px 13px', cursor: 'pointer', fontFamily: "'Inter', sans-serif", fontSize: 12.5, fontWeight: 500 }}
              >
                <RefreshCw size={13} /> {scanning ? 'Scansione in corso…' : 'Scansiona'}
              </button>
              <button
                onClick={disconnect}
                style={{ background: 'transparent', border: `1px solid ${T.line}`, color: T.slate, borderRadius: 6, padding: '8px 13px', cursor: 'pointer', fontFamily: "'Inter', sans-serif", fontSize: 12.5 }}
              >
                Scollega
              </button>
            </div>
          </div>

          {scanResult && (
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 20 }}>
              <Stamp tone="pine">{scanResult.candidatesCreated} nuovi candidati</Stamp>
              <Stamp tone="slate">{scanResult.messagesFound} mail trovate</Stamp>
              {scanResult.messagesSkippedAlreadySeen > 0 && (
                <Stamp tone="slate">{scanResult.messagesSkippedAlreadySeen} già viste</Stamp>
              )}
              {scanResult.attachmentsIrrelevant > 0 && (
                <Stamp tone="slate">{scanResult.attachmentsIrrelevant} scartati (non pertinenti alla casa)</Stamp>
              )}
              {scanResult.attachmentsFailed > 0 && (
                <Stamp tone="rust">{scanResult.attachmentsFailed} allegati non analizzabili</Stamp>
              )}
              {scanResult.reachedScanCap && (
                <Stamp tone="ochre">Limite scansione raggiunto — ripeti per continuare</Stamp>
              )}
            </div>
          )}

          {candidates.length === 0 ? (
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
              Nessun candidato in attesa. Avvia una scansione per cercare nuovi documenti nella mail.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {candidates.map((c) => {
                const busy = busyIds.has(c.id);
                const fields = c.extractedFields;
                return (
                  <div key={c.id} style={{ background: T.card, border: `1px solid ${T.line}`, borderRadius: 10, padding: '16px 18px' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
                      <FileText size={17} color={T.slate} style={{ marginTop: 2 }} />
                      <div style={{ flex: 1, minWidth: 200 }}>
                        <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 13.5, fontWeight: 500, color: T.ink }}>{c.originalFilename}</div>
                        <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 11.5, color: T.slate, marginTop: 2 }}>
                          Da {c.emailFrom} · {c.emailSubject} · {new Date(c.emailDate).toLocaleDateString('it-IT')}
                        </div>
                      </div>
                      {c.docType && (
                        <Stamp tone={c.aiConfidence && Number(c.aiConfidence) > 90 ? 'pine' : c.aiConfidence && Number(c.aiConfidence) > 80 ? 'ochre' : 'rust'}>
                          {c.docType}
                        </Stamp>
                      )}
                    </div>

                    {fields?.kind === 'asset_document' && fields.fields.length > 0 && (
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 20px', background: T.paper, borderRadius: 7, padding: '10px 14px', margin: '12px 0' }}>
                        {fields.fields.slice(0, 4).map(([k, v]) => (
                          <div key={k} style={{ fontFamily: "'Inter', sans-serif", fontSize: 12 }}>
                            <span style={{ color: T.slate }}>{k}: </span>
                            <span style={{ color: T.ink, fontWeight: 500 }}>{v}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                      <button
                        onClick={() => importCandidate(c.id)}
                        disabled={busy}
                        style={{ display: 'flex', alignItems: 'center', gap: 6, background: T.pine, color: '#F7F7F2', border: 'none', borderRadius: 6, padding: '8px 13px', cursor: 'pointer', fontFamily: "'Inter', sans-serif", fontSize: 12.5, fontWeight: 500 }}
                      >
                        <CheckCircle2 size={13} /> Importa in Inbox
                      </button>
                      <button
                        onClick={() => ignoreCandidate(c.id)}
                        disabled={busy}
                        style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'transparent', border: `1px solid ${T.line}`, color: T.slate, borderRadius: 6, padding: '8px 13px', cursor: 'pointer', fontFamily: "'Inter', sans-serif", fontSize: 12.5 }}
                      >
                        <XCircle size={13} /> Ignora
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
