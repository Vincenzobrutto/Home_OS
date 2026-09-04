import { useEffect, useState } from "react";
import {
  CalendarClock,
  Check,
  History,
  Pause,
  Play,
  Sparkles,
  Trash2,
} from "lucide-react";
import { api, formatDateForDisplay, parseDateInput } from "../api";
import { T } from "../theme";
import type {
  Asset,
  Contact,
  DocumentRecord,
  MaintenanceOccurrence,
  MaintenancePlan,
  MaintenanceRecurrenceUnit,
  MaintenanceSuggestion,
} from "../types";
import { SectionLabel, Stamp } from "./Shared";

const basedOnLabel: Record<MaintenanceSuggestion["basedOn"], string> = {
  installedAt: "data di installazione",
  purchasedAt: "data di acquisto",
  createdAt: "data di creazione della scheda",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  padding: "8px 10px",
  borderRadius: 6,
  border: `1px solid ${T.line}`,
  background: T.card,
  color: T.ink,
  fontFamily: "'Inter', sans-serif",
  fontSize: 12.5,
};

const fieldLabelStyle: React.CSSProperties = {
  display: "block",
  marginBottom: 5,
  color: T.slate,
  fontFamily: "'Inter', sans-serif",
  fontSize: 12,
};

const initialForm = {
  title: "",
  description: "",
  recurrenceUnit: "YEAR" as MaintenanceRecurrenceUnit,
  recurrenceInterval: "1",
  nextDueAt: "",
  reminderDaysBefore: "30",
  preferredContactId: "",
  isMandatory: false,
  notes: "",
};

const statusMeta = {
  SCHEDULED: { label: "Programmata", tone: "pine" as const },
  UPCOMING: { label: "Imminente", tone: "ochre" as const },
  OVERDUE: { label: "Scaduta", tone: "rust" as const },
  COMPLETED: { label: "Completata", tone: "slate" as const },
  PAUSED: { label: "Sospesa", tone: "slate" as const },
};

function recurrenceLabel(entry: {
  recurrenceUnit: MaintenanceRecurrenceUnit;
  recurrenceInterval: number;
}): string {
  if (entry.recurrenceUnit === "NONE") return "Una tantum";
  const unit =
    entry.recurrenceUnit === "DAY"
      ? "giorni"
      : entry.recurrenceUnit === "MONTH"
        ? "mesi"
        : "anni";
  return `Ogni ${entry.recurrenceInterval} ${unit}`;
}

// Replica minimale di addInterval (backend/src/common/maintenance-guidelines.ts):
// non importabile da qui (pacchetto frontend separato). Le guideline attuali
// usano solo YEAR/MONTH con interi pieni, quindi setFullYear/setMonth bastano
// — nessun edge case di overflow fine mese da gestire come nel backend.
function addRecurrence(
  date: Date,
  unit: MaintenanceRecurrenceUnit,
  interval: number,
): Date {
  const result = new Date(date);
  if (unit === "DAY") result.setUTCDate(result.getUTCDate() + interval);
  else if (unit === "MONTH") result.setUTCMonth(result.getUTCMonth() + interval);
  else if (unit === "YEAR") result.setUTCFullYear(result.getUTCFullYear() + interval);
  return result;
}

export function MaintenanceSection({
  asset,
  contacts,
  documents,
  onChanged,
}: {
  asset: Asset;
  contacts: Contact[];
  documents: DocumentRecord[];
  onChanged: () => void | Promise<void>;
}) {
  const [plans, setPlans] = useState<MaintenancePlan[]>([]);
  const [suggestions, setSuggestions] = useState<MaintenanceSuggestion[]>([]);
  // Data dell'ultima manutenzione inserita a mano, per suggerimento (chiave
  // guideline.code) — solo quando basedOn è "createdAt", cioè quando non
  // conosciamo davvero nessuna data e altrimenti proporremmo una scadenza
  // calcolata da "oggi" come se fosse un dato reale.
  const [manualBasisDates, setManualBasisDates] = useState<Record<string, string>>({});
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(initialForm);
  const [saving, setSaving] = useState(false);
  const [completing, setCompleting] = useState<MaintenancePlan | null>(null);
  const [completedAt, setCompletedAt] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [completionContactId, setCompletionContactId] = useState("");
  const [completionDocumentId, setCompletionDocumentId] = useState("");
  const [completionNotes, setCompletionNotes] = useState("");
  const [completionCost, setCompletionCost] = useState("");
  const [historyId, setHistoryId] = useState<string | null>(null);
  const [history, setHistory] = useState<MaintenanceOccurrence[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    const [plansData, suggestionsData] = await Promise.all([
      api.maintenance.listForAsset(asset.id),
      api.maintenance.suggestionsForAsset(asset.id),
    ]);
    setPlans(plansData);
    setSuggestions(suggestionsData);
  }

  useEffect(() => {
    refresh().catch((e: unknown) =>
      setError(e instanceof Error ? e.message : "Errore di caricamento"),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [asset.id]);

  function openCreate() {
    setEditingId(null);
    setForm(initialForm);
    setFormOpen(true);
    setError(null);
  }

  function openFromSuggestion(suggestion: MaintenanceSuggestion) {
    setEditingId(null);
    // Se l'utente ha indicato a mano l'ultima manutenzione (perché
    // basedOn === "createdAt", vedi sotto), la scadenza proposta si calcola
    // da quella data reale invece che dalla data di creazione della scheda.
    const manualBasis = manualBasisDates[suggestion.code]
      ? parseDateInput(manualBasisDates[suggestion.code])
      : undefined;
    const nextDueAt = manualBasis
      ? addRecurrence(new Date(manualBasis), suggestion.recurrenceUnit, suggestion.recurrenceInterval)
          .toISOString()
          .slice(0, 10)
      : suggestion.suggestedNextDueAt.slice(0, 10);
    setForm({
      title: suggestion.title,
      description: suggestion.description ?? "",
      recurrenceUnit: suggestion.recurrenceUnit,
      recurrenceInterval: String(suggestion.recurrenceInterval),
      nextDueAt,
      reminderDaysBefore: String(suggestion.reminderDaysBefore),
      preferredContactId: "",
      isMandatory: suggestion.isMandatory,
      notes: "",
    });
    setFormOpen(true);
    setError(null);
  }

  function openEdit(plan: MaintenancePlan) {
    setEditingId(plan.id);
    setForm({
      title: plan.title,
      description: plan.description ?? "",
      recurrenceUnit: plan.recurrenceUnit,
      recurrenceInterval: String(plan.recurrenceInterval),
      nextDueAt: plan.nextDueAt.slice(0, 10),
      reminderDaysBefore: String(plan.reminderDaysBefore),
      preferredContactId: plan.preferredContactId ?? "",
      isMandatory: plan.isMandatory,
      notes: plan.notes ?? "",
    });
    setFormOpen(true);
    setError(null);
  }

  async function savePlan() {
    if (!form.title.trim() || !form.nextDueAt) return;
    setSaving(true);
    setError(null);
    try {
      const data = {
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        recurrenceUnit: form.recurrenceUnit,
        recurrenceInterval:
          form.recurrenceUnit === "NONE" ? 1 : Number(form.recurrenceInterval),
        nextDueAt: form.nextDueAt,
        reminderDaysBefore: Number(form.reminderDaysBefore),
        preferredContactId: form.preferredContactId || null,
        isMandatory: form.isMandatory,
        notes: form.notes.trim() || undefined,
      };
      if (editingId) await api.maintenance.update(editingId, data);
      else await api.maintenance.create(asset.id, data);
      setFormOpen(false);
      await refresh();
      await onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Salvataggio non riuscito");
    } finally {
      setSaving(false);
    }
  }

  async function completePlan() {
    if (!completing || !completedAt) return;
    setSaving(true);
    setError(null);
    try {
      await api.maintenance.complete(completing.id, {
        completedAt,
        contactId: completionContactId || null,
        documentId: completionDocumentId || null,
        notes: completionNotes.trim() || undefined,
        costAmount: completionCost === "" ? null : Number(completionCost),
        currency: completionCost === "" ? null : "EUR",
      });
      setCompleting(null);
      setCompletionContactId("");
      setCompletionDocumentId("");
      setCompletionNotes("");
      setCompletionCost("");
      await refresh();
      await onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Completamento non riuscito");
    } finally {
      setSaving(false);
    }
  }

  async function toggleHistory(planId: string) {
    if (historyId === planId) return setHistoryId(null);
    setHistory(await api.maintenance.occurrences(planId));
    setHistoryId(planId);
  }

  async function reactivate(plan: MaintenancePlan) {
    const input = window.prompt(
      "Nuova prossima scadenza (gg/mm/aaaa)",
      formatDateForDisplay(plan.nextDueAt),
    );
    if (!input) return;
    const nextDueAt = parseDateInput(input);
    if (!nextDueAt)
      return setError("Inserisci la data nel formato gg/mm/aaaa.");
    await api.maintenance.reactivate(plan.id, nextDueAt);
    await refresh();
  }

  async function remove(plan: MaintenancePlan) {
    if (!window.confirm(`Eliminare il piano "${plan.title}"?`)) return;
    try {
      await api.maintenance.remove(plan.id);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Eliminazione non riuscita");
    }
  }

  return (
    <>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <SectionLabel>Manutenzione</SectionLabel>
        {!formOpen && (
          <button onClick={openCreate} style={linkButtonStyle}>
            + Nuovo piano
          </button>
        )}
      </div>
      {error && (
        <div style={{ color: T.rust, fontSize: 12.5, marginBottom: 10 }}>
          {error}
        </div>
      )}

      {!formOpen &&
        suggestions.map((suggestion) => (
            <div key={suggestion.code} style={suggestionCardStyle}>
              <div
                style={{ display: "flex", alignItems: "flex-start", gap: 10 }}
              >
                <Sparkles size={16} color={T.ochreDeep} style={{ marginTop: 2 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      flexWrap: "wrap",
                    }}
                  >
                    <strong style={{ fontSize: 13, color: T.ink }}>
                      {suggestion.title}
                    </strong>
                    <Stamp tone="ochre">Suggerita</Stamp>
                    {suggestion.isMandatory && (
                      <Stamp tone="rust">Obbligatoria</Stamp>
                    )}
                  </div>
                  {suggestion.description && (
                    <div
                      style={{ fontSize: 12, color: T.ink70, marginTop: 4 }}
                    >
                      {suggestion.description}
                    </div>
                  )}
                  {suggestion.basedOn === "createdAt" ? (
                    <div style={{ marginTop: 8 }}>
                      <div style={{ fontSize: 12, color: T.ochreDeep, marginBottom: 6 }}>
                        Non conosciamo la data dell'ultima manutenzione (né quella di installazione): indicala per calcolare la scadenza corretta — {recurrenceLabel(suggestion)} da quella data.
                      </div>
                      <input
                        style={{ ...inputStyle, maxWidth: 170, display: "inline-block" }}
                        placeholder="gg/mm/aaaa ultima manutenzione"
                        value={manualBasisDates[suggestion.code] ?? ""}
                        onChange={(e) =>
                          setManualBasisDates((current) => ({
                            ...current,
                            [suggestion.code]: e.target.value,
                          }))
                        }
                      />
                      {parseDateInput(manualBasisDates[suggestion.code] ?? "") && (
                        <div style={{ fontSize: 12, color: T.slate, marginTop: 6 }}>
                          Prossima scadenza:{" "}
                          {formatDateForDisplay(
                            addRecurrence(
                              new Date(parseDateInput(manualBasisDates[suggestion.code] ?? "")!),
                              suggestion.recurrenceUnit,
                              suggestion.recurrenceInterval,
                            ).toISOString(),
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div style={{ fontSize: 12, color: T.slate, marginTop: 5 }}>
                      Prima scadenza proposta{" "}
                      {formatDateForDisplay(suggestion.suggestedNextDueAt)} ·{" "}
                      {recurrenceLabel(suggestion)} · basata su{" "}
                      {basedOnLabel[suggestion.basedOn]}
                    </div>
                  )}
                </div>
              </div>
              <div style={{ display: "flex", gap: 7, marginTop: 10 }}>
                <button
                  onClick={() => openFromSuggestion(suggestion)}
                  style={smallButtonStyle}
                >
                  Aggiungi
                </button>
                <button
                  onClick={async () => {
                    await api.maintenance.dismissSuggestion(
                      asset.id,
                      suggestion.code,
                    );
                    await refresh();
                  }}
                  style={{ ...smallButtonStyle, color: T.slate }}
                >
                  Ignora
                </button>
              </div>
            </div>
          ))}

      {formOpen && (
        <div style={formCardStyle}>
          <div
            className="grid-responsive"
            style={{
              display: "grid",
              gridTemplateColumns: "1.4fr 1fr",
              gap: 8,
            }}
          >
            <input
              style={inputStyle}
              placeholder="Titolo"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
            <input
              style={inputStyle}
              type="date"
              value={form.nextDueAt}
              onChange={(e) => setForm({ ...form, nextDueAt: e.target.value })}
            />
          </div>
          <textarea
            style={{ ...inputStyle, marginTop: 8, resize: "vertical" }}
            placeholder="Descrizione o istruzioni"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
          <label style={{ display: "block", marginTop: 8, fontSize: 11.5, color: T.slate }}>
            Costo totale dell'intervento (€)
            <input
              style={{ ...inputStyle, marginTop: 3 }}
              type="number"
              min="0"
              step="0.01"
              value={completionCost}
              onChange={(e) => setCompletionCost(e.target.value)}
            />
          </label>
          <div
            className="grid-responsive"
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 0.7fr 0.8fr",
              gap: 8,
              marginTop: 8,
            }}
          >
            <div>
              <span style={fieldLabelStyle}>Ricorrenza</span>
              <select
                style={inputStyle}
                value={form.recurrenceUnit}
                onChange={(e) =>
                  setForm({
                    ...form,
                    recurrenceUnit: e.target
                      .value as MaintenanceRecurrenceUnit,
                  })
                }
              >
                <option value="NONE">Una tantum</option>
                <option value="DAY">Ogni N giorni</option>
                <option value="MONTH">Ogni N mesi</option>
                <option value="YEAR">Ogni N anni</option>
              </select>
            </div>
            <div>
              <span style={fieldLabelStyle}>Ogni quanti</span>
              <input
                style={inputStyle}
                type="number"
                min={1}
                disabled={form.recurrenceUnit === "NONE"}
                value={form.recurrenceInterval}
                onChange={(e) =>
                  setForm({ ...form, recurrenceInterval: e.target.value })
                }
              />
            </div>
            <div>
              <span style={fieldLabelStyle}>Preavviso (giorni)</span>
              <input
                style={inputStyle}
                type="number"
                min={0}
                max={365}
                value={form.reminderDaysBefore}
                onChange={(e) =>
                  setForm({ ...form, reminderDaysBefore: e.target.value })
                }
              />
            </div>
          </div>
          <select
            style={{ ...inputStyle, marginTop: 8 }}
            value={form.preferredContactId}
            onChange={(e) =>
              setForm({ ...form, preferredContactId: e.target.value })
            }
          >
            <option value="">Nessun contatto abituale</option>
            {contacts.map((contact) => (
              <option key={contact.id} value={contact.id}>
                {contact.name}
              </option>
            ))}
          </select>
          <textarea
            style={{ ...inputStyle, marginTop: 8, resize: "vertical" }}
            placeholder="Note"
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
          />
          <label
            style={{
              display: "flex",
              gap: 7,
              alignItems: "center",
              fontSize: 12.5,
              marginTop: 8,
              color: T.ink,
            }}
          >
            <input
              type="checkbox"
              checked={form.isMandatory}
              onChange={(e) =>
                setForm({ ...form, isMandatory: e.target.checked })
              }
            />{" "}
            Manutenzione obbligatoria
          </label>
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: 8,
              marginTop: 10,
            }}
          >
            <button
              onClick={() => setFormOpen(false)}
              style={secondaryButtonStyle}
            >
              Annulla
            </button>
            <button
              onClick={savePlan}
              disabled={saving || !form.title.trim() || !form.nextDueAt}
              style={primaryButtonStyle}
            >
              {saving ? "Salvataggio…" : "Salva"}
            </button>
          </div>
        </div>
      )}

      {plans.length === 0 && !formOpen && (
        <div
          style={{
            border: `1px dashed ${T.line}`,
            borderRadius: 9,
            padding: "14px 16px",
            marginBottom: 30,
            fontSize: 12.5,
            color: T.slate,
          }}
        >
          Nessun piano di manutenzione. Aggiungi la prima scadenza per questo
          asset.
        </div>
      )}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 10,
          marginBottom: 30,
        }}
      >
        {plans.map((plan) => {
          const meta = statusMeta[plan.status];
          return (
            <div
              key={plan.id}
              style={{
                background: T.card,
                border: `1px solid ${T.line}`,
                borderLeft: `3px solid ${plan.status === "OVERDUE" ? T.rust : plan.status === "UPCOMING" ? T.ochre : T.pine}`,
                borderRadius: 8,
                padding: "13px 14px",
              }}
            >
              <div
                style={{ display: "flex", alignItems: "flex-start", gap: 10 }}
              >
                <CalendarClock
                  size={17}
                  color={T.pine}
                  style={{ marginTop: 2 }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      flexWrap: "wrap",
                    }}
                  >
                    <strong style={{ fontSize: 13.5, color: T.ink }}>
                      {plan.title}
                    </strong>
                    <Stamp tone={meta.tone}>{meta.label}</Stamp>
                    {plan.isMandatory && (
                      <Stamp tone="rust">Obbligatoria</Stamp>
                    )}
                  </div>
                  <div style={{ fontSize: 12, color: T.slate, marginTop: 5 }}>
                    {plan.status === "COMPLETED"
                      ? "Completata il"
                      : "Prossima scadenza"}{" "}
                    {formatDateForDisplay(
                      plan.status === "COMPLETED"
                        ? plan.completedAt
                        : plan.nextDueAt,
                    )}{" "}
                    · {recurrenceLabel(plan)} · preavviso{" "}
                    {plan.reminderDaysBefore} gg
                  </div>
                  {plan.preferredContact && (
                    <div style={{ fontSize: 12, color: T.slate, marginTop: 2 }}>
                      Contatto: {plan.preferredContact.name}
                    </div>
                  )}
                  {plan.description && (
                    <div
                      style={{ fontSize: 12.5, color: T.ink70, marginTop: 6 }}
                    >
                      {plan.description}
                    </div>
                  )}
                </div>
              </div>
              <div
                style={{
                  display: "flex",
                  gap: 7,
                  flexWrap: "wrap",
                  marginTop: 10,
                }}
              >
                {!plan.pausedAt && !plan.completedAt && (
                  <button
                    onClick={() => {
                      setCompleting(plan);
                      setCompletionContactId(plan.preferredContactId ?? "");
                    }}
                    style={smallButtonStyle}
                  >
                    <Check size={13} /> Completa
                  </button>
                )}
                <button onClick={() => openEdit(plan)} style={smallButtonStyle}>
                  Modifica
                </button>
                {plan.pausedAt ? (
                  <button
                    onClick={() => reactivate(plan)}
                    style={smallButtonStyle}
                  >
                    <Play size={13} /> Riattiva
                  </button>
                ) : (
                  !plan.completedAt && (
                    <button
                      onClick={async () => {
                        await api.maintenance.pause(plan.id);
                        await refresh();
                      }}
                      style={smallButtonStyle}
                    >
                      <Pause size={13} /> Sospendi
                    </button>
                  )
                )}
                <button
                  onClick={() => toggleHistory(plan.id)}
                  style={smallButtonStyle}
                >
                  <History size={13} /> Storico ({plan._count.occurrences})
                </button>
                {plan._count.occurrences === 0 && (
                  <button
                    onClick={() => remove(plan)}
                    style={{ ...smallButtonStyle, color: T.rust }}
                  >
                    <Trash2 size={13} /> Elimina
                  </button>
                )}
              </div>
              {historyId === plan.id && (
                <div
                  style={{
                    marginTop: 10,
                    borderTop: `1px solid ${T.line}`,
                    paddingTop: 8,
                  }}
                >
                  {history.length === 0 ? (
                    <div style={{ fontSize: 12, color: T.slate }}>
                      Nessuna esecuzione registrata.
                    </div>
                  ) : (
                    history.map((item) => (
                      <div
                        key={item.id}
                        style={{ fontSize: 12, color: T.ink, marginBottom: 6 }}
                      >
                        {formatDateForDisplay(item.completedAt)} · prevista{" "}
                        {formatDateForDisplay(item.scheduledFor)}
                        {item.contact ? ` · ${item.contact.name}` : ""}
                        {item.document
                          ? ` · ${item.document.docType ?? item.document.originalFilename}`
                          : ""}
                        {item.intervention?.costAmount !== null && item.intervention?.costAmount !== undefined
                          ? ` · ${new Intl.NumberFormat("it-IT", { style: "currency", currency: item.intervention.currency ?? "EUR" }).format(Number(item.intervention.costAmount))}`
                          : ""}
                        {item.notes ? ` — ${item.notes}` : ""}
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {completing && (
        <div style={formCardStyle}>
          <strong style={{ fontSize: 13.5 }}>
            Completa: {completing.title}
          </strong>
          <div
            className="grid-responsive"
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 8,
              marginTop: 10,
            }}
          >
            <input
              style={inputStyle}
              type="date"
              value={completedAt}
              onChange={(e) => setCompletedAt(e.target.value)}
            />
            <select
              style={inputStyle}
              value={completionContactId}
              onChange={(e) => setCompletionContactId(e.target.value)}
            >
              <option value="">Nessun contatto</option>
              {contacts.map((contact) => (
                <option key={contact.id} value={contact.id}>
                  {contact.name}
                </option>
              ))}
            </select>
          </div>
          <select
            style={{ ...inputStyle, marginTop: 8 }}
            value={completionDocumentId}
            onChange={(e) => setCompletionDocumentId(e.target.value)}
          >
            <option value="">Nessun documento</option>
            {documents.map((document) => (
              <option key={document.id} value={document.id}>
                {document.docType ?? document.originalFilename}
              </option>
            ))}
          </select>
          <textarea
            style={{ ...inputStyle, marginTop: 8 }}
            placeholder="Note sull'intervento"
            value={completionNotes}
            onChange={(e) => setCompletionNotes(e.target.value)}
          />
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: 8,
              marginTop: 10,
            }}
          >
            <button
              onClick={() => setCompleting(null)}
              style={secondaryButtonStyle}
            >
              Annulla
            </button>
            <button
              onClick={completePlan}
              disabled={saving || !completedAt}
              style={primaryButtonStyle}
            >
              {saving ? "Salvataggio…" : "Conferma completamento"}
            </button>
          </div>
        </div>
      )}
    </>
  );
}

const suggestionCardStyle: React.CSSProperties = {
  background: T.paper,
  border: `1px dashed ${T.ochreDeep}`,
  borderRadius: 8,
  padding: "12px 14px",
  marginBottom: 10,
};
const formCardStyle: React.CSSProperties = {
  background: T.card,
  border: `1px solid ${T.line}`,
  borderRadius: 8,
  padding: 14,
  marginBottom: 16,
};
const linkButtonStyle: React.CSSProperties = {
  background: "none",
  border: "none",
  color: T.pine,
  cursor: "pointer",
  fontSize: 12,
  fontWeight: 500,
  marginBottom: 10,
};
const primaryButtonStyle: React.CSSProperties = {
  background: T.pine,
  color: "#F7F7F2",
  border: "none",
  borderRadius: 6,
  padding: "7px 13px",
  cursor: "pointer",
  fontSize: 12,
  fontWeight: 500,
};
const secondaryButtonStyle: React.CSSProperties = {
  background: "none",
  color: T.ink,
  border: `1px solid ${T.line}`,
  borderRadius: 6,
  padding: "7px 12px",
  cursor: "pointer",
  fontSize: 12,
};
const smallButtonStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 4,
  background: T.paper,
  color: T.ink,
  border: `1px solid ${T.line}`,
  borderRadius: 5,
  padding: "5px 8px",
  cursor: "pointer",
  fontSize: 11.5,
};
