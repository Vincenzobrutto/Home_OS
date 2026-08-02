import { useEffect, useState } from 'react';
import { CheckCircle2, FileText, FolderOpen, HardDrive, RefreshCw, XCircle } from 'lucide-react';
import { T } from '../theme';
import { SectionLabel, Stamp } from './Shared';
import { api } from '../api';
import type { DriveCandidate, DriveFolder, DriveScanResult, DriveStatus } from '../types';

export function DriveView({
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
  const [status, setStatus] = useState<DriveStatus | null>(null);
  const [candidates, setCandidates] = useState<DriveCandidate[]>([]);
  const [folders, setFolders] = useState<DriveFolder[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState('');
  const [loading, setLoading] = useState(true);
  const [savingFolder, setSavingFolder] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<DriveScanResult | null>(null);
  const [busyIds, setBusyIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    const [statusData, candidatesData] = await Promise.all([
      api.drive.status(userId),
      api.documents.driveCandidates(houseId),
    ]);
    setStatus(statusData);
    setCandidates(candidatesData);
    if (statusData.connected && !statusData.folderId) {
      setFolders(await api.drive.listFolders(userId));
    }
  }

  useEffect(() => {
    refresh().finally(() => setLoading(false));
  }, [houseId, userId]);

  async function confirmFolder() {
    const folder = folders.find((f) => f.id === selectedFolderId);
    if (!folder) return;
    setSavingFolder(true);
    setError(null);
    try {
      await api.drive.selectFolder(userId, folder.id, folder.name);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore imprevisto');
    } finally {
      setSavingFolder(false);
    }
  }

  async function scan() {
    setScanning(true);
    setError(null);
    setScanResult(null);
    try {
      const result = await api.drive.scan(houseId, userId);
      setScanResult(result);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore imprevisto');
    } finally {
      setScanning(false);
    }
  }

  async function disconnect() {
    if (!window.confirm('Scollegare Google Drive? Dovrai ricollegarti e riscegliere la cartella per riprendere le scansioni.')) {
      return;
    }
    await api.drive.disconnect(userId);
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
            Google Drive
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
              ? 'Account Drive collegato correttamente.'
              : "Non è stato possibile collegare l'account Drive. Verifica la configurazione (GOOGLE_CLIENT_ID/SECRET/GOOGLE_DRIVE_REDIRECT_URI) nel backend."}
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
            <HardDrive size={20} color={T.slate} />
            <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 14, fontWeight: 500, color: T.ink }}>
              Nessun account Drive collegato
            </div>
          </div>
          <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 12.5, color: T.ink70, marginBottom: 18, lineHeight: 1.5 }}>
            Collegando Drive (accesso in sola lettura) puoi scegliere una cartella dove raccogli tu i documenti utili (fatture,
            manuali, certificati) e farla scansionare: dato che la curi tu, non serve nessun filtro — ogni file trovato va comunque
            approvato singolarmente prima di entrare in Inbox.
          </div>
          <a
            href={api.drive.connectUrl(userId)}
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
            <HardDrive size={15} /> Collega Drive
          </a>
        </div>
      ) : !status.folderId ? (
        <div style={{ background: T.card, border: `1px solid ${T.line}`, borderRadius: 10, padding: '24px 22px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
            <FolderOpen size={20} color={T.slate} />
            <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 14, fontWeight: 500, color: T.ink }}>
              Scegli quale cartella scansionare
            </div>
          </div>
          <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 12.5, color: T.ink70, marginBottom: 16 }}>
            Collegato come <strong>{status.email}</strong>. Seleziona la cartella di Drive dove raccogli i documenti della casa.
          </div>
          {folders.length === 0 ? (
            <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 12.5, color: T.slate }}>
              Nessuna cartella trovata in questo account Drive.
            </div>
          ) : (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <select
                value={selectedFolderId}
                onChange={(e) => setSelectedFolderId(e.target.value)}
                style={{ fontFamily: "'Inter', sans-serif", fontSize: 12.5, padding: '8px 10px', borderRadius: 6, border: `1px solid ${T.line}`, background: T.paper, color: T.ink, minWidth: 220 }}
              >
                <option value="">— seleziona cartella —</option>
                {folders.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
              <button
                onClick={confirmFolder}
                disabled={!selectedFolderId || savingFolder}
                style={{ display: 'flex', alignItems: 'center', gap: 6, background: T.pine, color: '#F7F7F2', border: 'none', borderRadius: 6, padding: '8px 13px', cursor: 'pointer', fontFamily: "'Inter', sans-serif", fontSize: 12.5, fontWeight: 500 }}
              >
                <CheckCircle2 size={13} /> {savingFolder ? 'Salvataggio…' : 'Conferma cartella'}
              </button>
            </div>
          )}
        </div>
      ) : (
        <>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, background: T.card, border: `1px solid ${T.line}`, borderRadius: 10, padding: '16px 18px', marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <HardDrive size={17} color={T.pine} />
              <div>
                <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 500, color: T.ink }}>{status.email}</div>
                <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 11.5, color: T.slate }}>
                  Cartella: <strong>{status.folderName}</strong>
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
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
              <Stamp tone="slate">{scanResult.filesFound} file trovati</Stamp>
              {scanResult.filesSkippedAlreadySeen > 0 && (
                <Stamp tone="slate">{scanResult.filesSkippedAlreadySeen} già visti</Stamp>
              )}
              {scanResult.attachmentsIrrelevant > 0 && (
                <Stamp tone="slate">{scanResult.attachmentsIrrelevant} scartati (non pertinenti alla casa)</Stamp>
              )}
              {scanResult.attachmentsFailed > 0 && (
                <Stamp tone="rust">{scanResult.attachmentsFailed} file non analizzabili</Stamp>
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
              Nessun candidato in attesa. Avvia una scansione per cercare nuovi documenti nella cartella.
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
                          Modificato {new Date(c.driveModifiedAt).toLocaleDateString('it-IT')}
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
