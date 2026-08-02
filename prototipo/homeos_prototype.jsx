import React, { useState, useRef } from "react";
import {
  Home, Flame, Zap, Droplets, Sun, Wind, ChefHat, Inbox as InboxIcon,
  LayoutGrid, FileText, Clock, ShieldCheck, AlertTriangle, CheckCircle2,
  Upload, Sparkles, ChevronRight, ChevronLeft, Calendar, Wrench, Euro,
  Building2, X, Refrigerator, Square, Layers, Armchair, BedDouble, Bath, DoorOpen, Map
} from "lucide-react";

// ---------------------------------------------------------------------------
// TOKENS
// ---------------------------------------------------------------------------
const T = {
  paper: "#F1F1EC",
  paperDeep: "#E7E7DE",
  ink: "#1B2420",
  ink70: "#1B242099",
  pine: "#2C5C4C",
  pineDeep: "#1E4136",
  ochre: "#C4842A",
  ochreDeep: "#8F5F1C",
  rust: "#A94A2E",
  line: "#D6D6C9",
  card: "#FAFAF6",
  slate: "#5C6B66",
};

const FONTS = `
@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Inter:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap');
`;

// ---------------------------------------------------------------------------
// MOCK DATA
// ---------------------------------------------------------------------------
const DEMO_HOUSE = {
  name: "Via dei Glicini 14",
  city: "Milano",
  surface: 120,
  rooms: 4,
  year: 2010,
  code: "CASA—0142",
};

function makeHouseCode() {
  const n = Math.floor(100 + Math.random() * 900);
  return `CASA—0${n}`;
}

const ROOM_TYPES = {
  cucina: { label: "Cucina", icon: ChefHat, color: T.slate },
  soggiorno: { label: "Soggiorno", icon: Armchair, color: T.pine },
  camera: { label: "Camera da letto", icon: BedDouble, color: T.ochreDeep },
  bagno: { label: "Bagno", icon: Bath, color: T.rust },
};

const ASSET_TYPES = {
  caldaia: { label: "Caldaia", icon: Flame, color: T.rust },
  elettrico: { label: "Impianto elettrico", icon: Zap, color: T.ochreDeep },
  idraulico: { label: "Impianto idraulico", icon: Droplets, color: T.pine },
  fotovoltaico: { label: "Fotovoltaico", icon: Sun, color: T.ochre },
  clima: { label: "Climatizzazione", icon: Wind, color: T.pine },
  tetto: { label: "Tetto", icon: Layers, color: T.ochreDeep },
  finestre: { label: "Finestre", icon: Square, color: T.slate },
  elettrodomestico: { label: "Elettrodomestico", icon: Refrigerator, color: T.slate },
};

// Asset types offered during onboarding (whole-house plant/structure).
// "elettrodomestico" is deliberately excluded: appliances are added later, room by room.
const STRUCTURAL_ASSET_KEYS = ["caldaia", "elettrico", "idraulico", "fotovoltaico", "clima", "tetto", "finestre"];

function makeRoomCode(index) {
  return `AMB—${String(index + 1).padStart(3, "0")}`;
}

// Spreads markers out within a zone (room or tray) so new/default assets don't stack exactly.
function defaultPos(indexInZone) {
  const col = indexInZone % 3;
  const row = Math.floor(indexInZone / 3);
  return { x: 0.22 + col * 0.28, y: 0.28 + row * 0.32 };
}

const initialRooms = [
  { id: "r1", code: "AMB—001", type: "cucina", name: "Cucina" },
  { id: "r2", code: "AMB—002", type: "soggiorno", name: "Soggiorno" },
  { id: "r3", code: "AMB—003", type: "camera", name: "Camera matrimoniale" },
  { id: "r4", code: "AMB—004", type: "bagno", name: "Bagno" },
];

const initialAssets = [
  {
    id: "a1", code: "AST—001", type: "caldaia", name: "Caldaia a condensazione", roomId: null, pos: { x: 0.15, y: 0.5 },
    installedAt: "12/03/2022", warrantyUntil: "12/03/2027", status: "ok",
    customFields: [
      { id: "c1", label: "Fornitore", value: "Vaillant Group" },
      { id: "c2", label: "Modello", value: "ecoTEC plus" },
    ],
    documents: [
      { id: "d1", name: "Fattura_Caldaia_Vaillant.pdf", type: "Fattura", date: "12/03/2022" },
      { id: "d2", name: "Manuale_Vaillant_ecoTEC.pdf", type: "Manuale", date: "12/03/2022" },
    ],
    timeline: [
      { date: "12/03/2022", event: "Installazione", detail: "Vaillant Group — €3.450" },
      { date: "02/11/2023", event: "Manutenzione ordinaria", detail: "Controllo combustione" },
    ],
  },
  {
    id: "a2", code: "AST—002", type: "elettrico", name: "Impianto elettrico", roomId: null, pos: { x: 0.4, y: 0.5 },
    installedAt: "—", warrantyUntil: null, status: "attention",
    customFields: [
      { id: "c3", label: "Numero certificazione", value: "IM/2019/00452" },
    ],
    documents: [
      { id: "d3", name: "Certificato_Conformita_2019.pdf", type: "Certificato", date: "05/06/2019" },
    ],
    timeline: [
      { date: "05/06/2019", event: "Certificazione conformità", detail: "Rifacimento parziale" },
    ],
  },
  {
    id: "a3", code: "AST—003", type: "fotovoltaico", name: "Impianto fotovoltaico", roomId: null, pos: { x: 0.65, y: 0.5 },
    installedAt: "18/07/2023", warrantyUntil: "18/07/2033", status: "ok",
    customFields: [
      { id: "c4", label: "Fornitore", value: "SolarEdge" },
      { id: "c5", label: "Potenza", value: "4.8 kWp" },
    ],
    documents: [
      { id: "d4", name: "Contratto_Installazione_Solaredge.pdf", type: "Contratto", date: "18/07/2023" },
    ],
    timeline: [
      { date: "18/07/2023", event: "Installazione", detail: "SolarEdge — 12 pannelli, 4.8kWp" },
    ],
  },
  {
    id: "a4", code: "AST—004", type: "clima", name: "Climatizzatori (3 unità)", roomId: null, pos: { x: 0.88, y: 0.5 },
    installedAt: "20/05/2021", warrantyUntil: "20/05/2026", status: "due",
    customFields: [],
    documents: [],
    timeline: [
      { date: "20/05/2021", event: "Installazione", detail: "Daikin Perfera — 3 split" },
      { date: "15/06/2024", event: "Manutenzione ordinaria", detail: "Pulizia filtri e ricarica gas" },
    ],
  },
  {
    id: "a5", code: "AST—005", type: "elettrodomestico", name: "Forno da incasso", roomId: "r1", pos: { x: 0.3, y: 0.3 },
    installedAt: "10/09/2021", warrantyUntil: "10/09/2023", status: "ok",
    customFields: [],
    documents: [],
    timeline: [
      { date: "10/09/2021", event: "Installazione", detail: "Sostituzione completa cucina" },
    ],
  },
  {
    id: "a6", code: "AST—006", type: "elettrodomestico", name: "Piano cottura a induzione", roomId: "r1", pos: { x: 0.68, y: 0.3 },
    installedAt: "10/09/2021", warrantyUntil: "10/09/2023", status: "ok",
    customFields: [],
    documents: [],
    timeline: [
      { date: "10/09/2021", event: "Installazione", detail: "Sostituzione completa cucina" },
    ],
  },
];

// Mock AI extraction used when uploading a document directly from an asset's own page
// (as opposed to the general Inbox, where the target asset isn't known yet).
const ASSET_DOC_MOCKS = {
  caldaia: { docName: "Fattura_Assistenza_Caldaia.pdf", confidence: 95, fields: [
    ["Fornitore", "Assistenza Vaillant"], ["Data intervento", "02/11/2023"], ["Importo", "€180"],
  ]},
  elettrico: { docName: "Certificato_Conformita_Impianto.pdf", confidence: 93, fields: [
    ["Numero certificazione", "IM/2024/00981"], ["Tecnico installatore", "Rossi Impianti Srl"], ["Data certificazione", "14/02/2024"],
  ]},
  idraulico: { docName: "Certificato_Conformita_Idraulico.pdf", confidence: 90, fields: [
    ["Numero certificazione", "ID/2023/00217"], ["Tecnico installatore", "Idrotermica Bianchi"],
  ]},
  fotovoltaico: { docName: "Certificato_Garanzia_Inverter.pdf", confidence: 91, fields: [
    ["Fornitore", "SolarEdge"], ["Scadenza garanzia", "18/07/2033"],
  ]},
  clima: { docName: "Libretto_Climatizzatore_Daikin.pdf", confidence: 88, fields: [
    ["Modello", "Daikin Perfera FTXM-R"], ["Data installazione", "20/05/2021"],
  ]},
  tetto: { docName: "Relazione_Tecnica_Tetto.pdf", confidence: 84, fields: [
    ["Tipo intervento", "Rifacimento manto"], ["Impresa", "Coperture Lombarde"],
  ]},
  finestre: { docName: "Scheda_Tecnica_Serramenti.pdf", confidence: 87, fields: [
    ["Fornitore", "Internorm"], ["Trasmittanza termica", "0.8 W/m²K"],
  ]},
  elettrodomestico: { docName: "Scontrino_Acquisto.pdf", confidence: 82, fields: [
    ["Fornitore", "Euronics"], ["Garanzia", "24 mesi"],
  ]},
};

// Extracted-field labels that should also update the asset's structured dates, not just its custom fields.
const INSTALL_DATE_HINTS = ["installazione", "intervento"];
const WARRANTY_HINTS = ["garanzia", "scadenza"];

let customFieldIdCounter = 900;

// Shared by the general Inbox and by "carica documento" on an asset's own page:
// takes AI-extracted [label, value] pairs and merges them into the asset's
// structured fields (installedAt/warrantyUntil) or free-form customFields.
function applyFieldsToAsset(asset, fields) {
  let installedAt = asset.installedAt;
  let warrantyUntil = asset.warrantyUntil;
  const nextFields = asset.customFields.map((f) => ({ ...f }));
  fields.forEach(([label, value]) => {
    const lower = label.toLowerCase();
    if (lower === "tipo documento") return;
    if (INSTALL_DATE_HINTS.some((h) => lower.includes(h))) {
      installedAt = value;
    } else if (WARRANTY_HINTS.some((h) => lower.includes(h))) {
      warrantyUntil = value;
    } else {
      const existing = nextFields.find((f) => f.label.toLowerCase() === lower);
      if (existing) existing.value = value;
      else { customFieldIdCounter += 1; nextFields.push({ id: "c" + customFieldIdCounter, label, value }); }
    }
  });
  return { installedAt, warrantyUntil, customFields: nextFields };
}

const docPool = [
  {
    name: "Certificato_Garanzia_Inverter.pdf", assetType: "fotovoltaico", confidence: 91,
    fields: [
      ["Tipo documento", "Certificato di garanzia"],
      ["Fornitore", "SolarEdge"],
      ["Scadenza garanzia", "18/07/2033"],
    ],
  },
  {
    name: "Libretto_Climatizzatore_Daikin.pdf", assetType: "clima", confidence: 88,
    fields: [
      ["Tipo documento", "Manuale d'uso"],
      ["Modello", "Daikin Perfera FTXM-R"],
      ["Pagine", "24"],
    ],
  },
  {
    name: "Foto_Quadro_Elettrico.jpg", assetType: "elettrico", confidence: 74,
    fields: [
      ["Tipo documento", "Documentazione fotografica"],
      ["Nota", "Foto quadro elettrico, vano scale"],
    ],
  },
  {
    name: "Fattura_Assistenza_Caldaia.pdf", assetType: "caldaia", confidence: 95,
    fields: [
      ["Tipo documento", "Fattura"],
      ["Fornitore", "Assistenza Vaillant"],
      ["Importo", "€180"],
      ["Data", "02/11/2023"],
    ],
  },
  {
    name: "Certificato_Conformita_Idraulico.pdf", assetType: "idraulico", confidence: 90,
    fields: [
      ["Tipo documento", "Certificato di conformità"],
      ["Numero certificazione", "ID/2023/00217"],
      ["Tecnico installatore", "Idrotermica Bianchi"],
    ],
  },
];

let inboxSeed = [
  { id: "i1", name: "Bolletta_Gas_Giugno.pdf", uploadedAt: "oggi, 09:14", status: "pending" },
  { id: "i2", name: "Foto_Caldaia_Targhetta.jpg", uploadedAt: "oggi, 09:15", status: "pending" },
];

const reminders = [
  { id: "r1", assetId: "a4", title: "Manutenzione climatizzatori", detail: "Consigliata prima dell'estate", due: "entro 30 giorni", level: "high" },
  { id: "r2", assetId: "a2", title: "Impianto elettrico da verificare", detail: "Nessuna documentazione recente", due: "da pianificare", level: "medium" },
  { id: "r3", assetId: "a1", title: "Garanzia caldaia", detail: "In corso di validità", due: "scade 12/03/2027", level: "low" },
];

let docIdCounter = 100;

// ---------------------------------------------------------------------------
// SMALL UI PARTS
// ---------------------------------------------------------------------------
function Stamp({ children, tone = "pine" }) {
  const colors = {
    pine: T.pine, ochre: T.ochreDeep, rust: T.rust, slate: T.slate,
  };
  return (
    <span
      style={{
        display: "inline-block",
        fontFamily: "'IBM Plex Mono', monospace",
        fontSize: 10.5,
        letterSpacing: "0.06em",
        textTransform: "uppercase",
        color: colors[tone],
        border: `1px solid ${colors[tone]}`,
        borderRadius: 3,
        padding: "3px 7px",
        transform: "rotate(-1.5deg)",
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </span>
  );
}

function StatusDot({ status }) {
  const map = {
    ok: { c: T.pine, l: "In regola" },
    attention: { c: T.ochreDeep, l: "Da verificare" },
    due: { c: T.rust, l: "In scadenza" },
  };
  const s = map[status] || map.ok;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, color: T.ink70 }}>
      <span style={{ width: 7, height: 7, borderRadius: "50%", background: s.c, display: "inline-block" }} />
      {s.l}
    </span>
  );
}

function SectionLabel({ children }) {
  return (
    <div style={{
      fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, letterSpacing: "0.08em",
      textTransform: "uppercase", color: T.slate, marginBottom: 10,
    }}>
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// SIDEBAR
// ---------------------------------------------------------------------------
function Sidebar({ view, setView, inboxCount, house, onEditHouse, onOpenFeedbackSummary }) {
  const items = [
    { id: "dashboard", label: "Dashboard", icon: LayoutGrid },
    { id: "inbox", label: "Inbox", icon: InboxIcon, badge: inboxCount },
    { id: "floorplan", label: "Planimetria", icon: Map },
    { id: "rooms", label: "Ambienti", icon: DoorOpen },
    { id: "assets", label: "Asset", icon: Building2 },
  ];
  return (
    <div style={{
      width: 220, minWidth: 220, background: T.ink, color: "#EEEFE8",
      display: "flex", flexDirection: "column", padding: "22px 16px",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "0 6px", marginBottom: 34 }}>
        <div style={{
          width: 26, height: 26, borderRadius: 6, background: T.pine,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <Home size={15} color="#F1F1EC" />
        </div>
        <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: 16, letterSpacing: "-0.01em" }}>
          HomeOS
        </span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {items.map((it) => {
          const Icon = it.icon;
          const active = view === it.id
            || (view === "asset-detail" && it.id === "assets")
            || (view === "room-detail" && it.id === "rooms");
          return (
            <button
              key={it.id}
              onClick={() => setView(it.id)}
              style={{
                display: "flex", alignItems: "center", gap: 10, padding: "9px 10px",
                borderRadius: 7, border: "none", cursor: "pointer", textAlign: "left",
                background: active ? "rgba(255,255,255,0.09)" : "transparent",
                color: active ? "#FAFAF6" : "#B9BFB6",
                fontFamily: "'Inter', sans-serif", fontSize: 13.5, fontWeight: 500,
                transition: "background 0.15s ease",
              }}
            >
              <Icon size={16} />
              <span style={{ flex: 1 }}>{it.label}</span>
              {!!it.badge && (
                <span style={{
                  background: T.ochre, color: T.ink, fontSize: 10.5, fontWeight: 600,
                  borderRadius: 10, padding: "1px 7px", fontFamily: "'IBM Plex Mono', monospace",
                }}>
                  {it.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div
        onClick={onEditHouse}
        style={{ marginTop: "auto", paddingTop: 18, borderTop: "1px solid rgba(255,255,255,0.1)", cursor: onEditHouse ? "pointer" : "default" }}
      >
        <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: "#8A9089", letterSpacing: "0.05em" }}>
          {house.code}
        </div>
        <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 12.5, color: "#D5D8CE", marginTop: 2 }}>
          {house.name}, {house.city}
        </div>
      </div>
      <button
        onClick={onOpenFeedbackSummary}
        style={{
          marginTop: 10, background: "none", border: "none", cursor: "pointer", color: "#8A9089",
          fontFamily: "'Inter', sans-serif", fontSize: 11, padding: 0, textAlign: "left",
        }}
      >
        Feedback ricevuti →
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// DASHBOARD
// ---------------------------------------------------------------------------
function Dashboard({ house, rooms, assets, inbox, setView, openAsset }) {
  const totalDocs = assets.reduce((n, a) => n + a.documents.length, 0);
  const dueSoon = assets.filter((a) => a.status === "due" || a.status === "attention").length;
  const activeReminders = reminders.filter((r) => assets.some((a) => a.id === r.assetId));

  return (
    <div style={{ padding: "36px 44px", maxWidth: 980 }}>
      <SectionLabel>{house.code} — Panoramica</SectionLabel>
      <h1 style={{
        fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: 30,
        color: T.ink, margin: "0 0 6px 0", letterSpacing: "-0.01em",
      }}>
        {house.name}, {house.city}
      </h1>
      <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 14, color: T.ink70, margin: "0 0 30px 0" }}>
        {house.surface} m² · {house.rooms} locali · costruita nel {house.year}
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 34 }}>
        {[
          { label: "Ambienti", value: rooms.length, icon: DoorOpen },
          { label: "Asset censiti", value: assets.length, icon: Building2 },
          { label: "Documenti collegati", value: totalDocs, icon: FileText },
          { label: "Da verificare", value: dueSoon, icon: AlertTriangle },
        ].map((s) => (
          <div key={s.label} style={{
            background: T.card, border: `1px solid ${T.line}`, borderRadius: 10, padding: "16px 16px",
          }}>
            <s.icon size={16} color={T.pine} style={{ marginBottom: 10 }} />
            <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 24, fontWeight: 600, color: T.ink }}>
              {s.value}
            </div>
            <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: T.slate }}>{s.label}</div>
          </div>
        ))}
      </div>

      <SectionLabel>Promemoria</SectionLabel>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 34 }}>
        {activeReminders.length === 0 && (
          <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: T.slate }}>
            Nessun promemoria per ora. Compariranno man mano che colleghi documenti e scadenze agli asset.
          </div>
        )}
        {activeReminders.map((r) => {
          const asset = assets.find((a) => a.id === r.assetId);
          const levelColor = r.level === "high" ? T.rust : r.level === "medium" ? T.ochreDeep : T.pine;
          return (
            <div
              key={r.id}
              onClick={() => openAsset(r.assetId)}
              style={{
                display: "flex", alignItems: "center", gap: 14, background: T.card,
                border: `1px solid ${T.line}`, borderLeft: `3px solid ${levelColor}`,
                borderRadius: 8, padding: "13px 16px", cursor: "pointer",
              }}
            >
              <Clock size={15} color={levelColor} />
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 13.5, fontWeight: 500, color: T.ink }}>
                  {r.title}
                </div>
                <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: T.slate }}>
                  {asset?.name} · {r.detail}
                </div>
              </div>
              <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: levelColor }}>
                {r.due}
              </div>
              <ChevronRight size={15} color={T.slate} />
            </div>
          );
        })}
      </div>

      {inbox.length > 0 && (
        <div
          onClick={() => setView("inbox")}
          style={{
            display: "flex", alignItems: "center", gap: 12, background: T.pineDeep,
            borderRadius: 10, padding: "16px 18px", cursor: "pointer", color: "#F1F1EC",
          }}
        >
          <Sparkles size={17} />
          <div style={{ flex: 1, fontFamily: "'Inter', sans-serif", fontSize: 13.5 }}>
            <strong>{inbox.length} document{inbox.length > 1 ? "i" : "o"}</strong> in attesa di analisi nell'Inbox
          </div>
          <ChevronRight size={16} />
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// INBOX
// ---------------------------------------------------------------------------
function InboxView({ inbox, setInbox, assets, setAssets, onFieldsApplied, onCreateAssetForType }) {
  const [poolIdx, setPoolIdx] = useState(0);
  const [editingFor, setEditingFor] = useState(null); // doc id currently choosing a different asset

  function simulateUpload() {
    const pick = docPool[poolIdx % docPool.length];
    setPoolIdx((n) => n + 1);
    docIdCounter += 1;
    setInbox((prev) => [
      ...prev,
      { id: "i" + docIdCounter, name: pick.name, uploadedAt: "ora", status: "pending", _mock: pick },
    ]);
  }

  function analyze(docId) {
    setInbox((prev) => prev.map((d) => (d.id === docId ? { ...d, status: "analyzing" } : d)));
    setTimeout(() => {
      setInbox((prev) => prev.map((d) => {
        if (d.id !== docId) return d;
        const mock = d._mock || docPool[Math.floor(Math.random() * docPool.length)];
        const match = assets.find((a) => a.type === mock.assetType);
        return {
          ...d, status: "analyzed",
          suggestedAssetId: match ? match.id : null,
          suggestedType: mock.assetType,
          confidence: mock.confidence, fields: mock.fields,
        };
      }));
    }, 1100);
  }

  function confirm(docId, assetId, applyFields) {
    const doc = inbox.find((d) => d.id === docId);
    if (!doc) return;
    setAssets((prev) => prev.map((a) => {
      if (a.id !== assetId) return a;
      const newDoc = { id: docId, name: doc.name, type: doc.fields?.[0]?.[1] || "Documento", date: "oggi" };
      const patch = applyFields ? applyFieldsToAsset(a, doc.fields) : {};
      return {
        ...a,
        ...patch,
        documents: [...a.documents, newDoc],
        timeline: [{ date: "oggi", event: applyFields ? "Documento collegato e dati aggiornati" : "Documento collegato", detail: doc.name }, ...a.timeline],
      };
    }));
    setInbox((prev) => prev.filter((d) => d.id !== docId));
    setEditingFor(null);
    if (applyFields && onFieldsApplied) onFieldsApplied();
  }

  function confirmWithNewAsset(docId, type, applyFields) {
    const newAssetId = onCreateAssetForType(type);
    confirm(docId, newAssetId, applyFields);
  }

  return (
    <div style={{ padding: "36px 44px", maxWidth: 820 }}>
      <SectionLabel>Acquisizione documenti</SectionLabel>
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 26 }}>
        <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: 26, color: T.ink, margin: 0 }}>
          Inbox
        </h1>
        <button
          onClick={simulateUpload}
          style={{
            display: "flex", alignItems: "center", gap: 8, background: T.pine, color: "#F7F7F2",
            border: "none", borderRadius: 7, padding: "9px 15px", cursor: "pointer",
            fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 500,
          }}
        >
          <Upload size={15} /> Carica documento
        </button>
      </div>

      {inbox.length === 0 && (
        <div style={{
          border: `1px dashed ${T.line}`, borderRadius: 10, padding: "50px 20px",
          textAlign: "center", color: T.slate, fontFamily: "'Inter', sans-serif", fontSize: 13.5,
        }}>
          Inbox vuota. Carica un documento per vedere l'AI proporre la classificazione.
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {inbox.map((doc) => (
          <div key={doc.id} style={{ background: T.card, border: `1px solid ${T.line}`, borderRadius: 10, padding: "16px 18px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <FileText size={17} color={T.slate} />
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 13.5, fontWeight: 500, color: T.ink }}>
                  {doc.name}
                </div>
                <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 11.5, color: T.slate }}>
                  Caricato {doc.uploadedAt}
                </div>
              </div>
              {doc.status === "pending" && (
                <button
                  onClick={() => analyze(doc.id)}
                  style={{
                    display: "flex", alignItems: "center", gap: 6, background: "transparent",
                    border: `1px solid ${T.pine}`, color: T.pine, borderRadius: 6, padding: "7px 12px",
                    cursor: "pointer", fontFamily: "'Inter', sans-serif", fontSize: 12.5, fontWeight: 500,
                  }}
                >
                  <Sparkles size={13} /> Analizza con AI
                </button>
              )}
              {doc.status === "analyzing" && (
                <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11.5, color: T.ochreDeep }}>
                  analisi in corso…
                </span>
              )}
            </div>

            {doc.status === "analyzed" && (
              <div style={{ marginTop: 14, paddingTop: 14, borderTop: `1px solid ${T.line}` }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                  <Stamp tone={doc.confidence > 90 ? "pine" : doc.confidence > 80 ? "ochre" : "rust"}>
                    confidenza {doc.confidence}%
                  </Stamp>
                  {doc.suggestedAssetId ? (
                    <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 12.5, color: T.ink70 }}>
                      Asset suggerito:&nbsp;
                      <strong>{assets.find((a) => a.id === doc.suggestedAssetId)?.name}</strong>
                    </span>
                  ) : (
                    <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 12.5, color: T.ochreDeep }}>
                      Nessun asset "{ASSET_TYPES[doc.suggestedType]?.label}" trovato in questa casa
                    </span>
                  )}
                </div>

                <div style={{
                  display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 20px",
                  background: T.paper, borderRadius: 7, padding: "10px 14px", marginBottom: 14,
                }}>
                  {doc.fields.map(([k, v]) => (
                    <div key={k} style={{ fontFamily: "'Inter', sans-serif", fontSize: 12 }}>
                      <span style={{ color: T.slate }}>{k}: </span>
                      <span style={{ color: T.ink, fontWeight: 500 }}>{v}</span>
                    </div>
                  ))}
                </div>

                {editingFor === doc.id ? (
                  <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                    {assets.map((a) => (
                      <button
                        key={a.id}
                        onClick={() => confirm(doc.id, a.id, true)}
                        style={{
                          fontFamily: "'Inter', sans-serif", fontSize: 12, padding: "6px 10px",
                          borderRadius: 6, border: `1px solid ${T.line}`, background: T.card, cursor: "pointer",
                        }}
                      >
                        {a.name}
                      </button>
                    ))}
                    <button onClick={() => setEditingFor(null)} style={{ border: "none", background: "none", cursor: "pointer", color: T.slate }}>
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {doc.suggestedAssetId ? (
                      <>
                        <button
                          onClick={() => confirm(doc.id, doc.suggestedAssetId, true)}
                          style={{
                            display: "flex", alignItems: "center", gap: 6, background: T.pine, color: "#F7F7F2",
                            border: "none", borderRadius: 6, padding: "8px 13px", cursor: "pointer",
                            fontFamily: "'Inter', sans-serif", fontSize: 12.5, fontWeight: 500,
                          }}
                        >
                          <CheckCircle2 size={13} /> Conferma e applica dati
                        </button>
                        <button
                          onClick={() => confirm(doc.id, doc.suggestedAssetId, false)}
                          style={{
                            background: "transparent", border: `1px solid ${T.line}`, color: T.ink,
                            borderRadius: 6, padding: "8px 13px", cursor: "pointer",
                            fontFamily: "'Inter', sans-serif", fontSize: 12.5,
                          }}
                        >
                          Solo collega documento
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => confirmWithNewAsset(doc.id, doc.suggestedType, true)}
                          style={{
                            display: "flex", alignItems: "center", gap: 6, background: T.pine, color: "#F7F7F2",
                            border: "none", borderRadius: 6, padding: "8px 13px", cursor: "pointer",
                            fontFamily: "'Inter', sans-serif", fontSize: 12.5, fontWeight: 500,
                          }}
                        >
                          <Sparkles size={13} /> Crea asset "{ASSET_TYPES[doc.suggestedType]?.label}" e applica dati
                        </button>
                        <button
                          onClick={() => confirmWithNewAsset(doc.id, doc.suggestedType, false)}
                          style={{
                            background: "transparent", border: `1px solid ${T.line}`, color: T.ink,
                            borderRadius: 6, padding: "8px 13px", cursor: "pointer",
                            fontFamily: "'Inter', sans-serif", fontSize: 12.5,
                          }}
                        >
                          Crea asset e collega solo il documento
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => setEditingFor(doc.id)}
                      style={{
                        background: "transparent", border: `1px solid ${T.line}`, color: T.ink,
                        borderRadius: 6, padding: "8px 13px", cursor: "pointer",
                        fontFamily: "'Inter', sans-serif", fontSize: 12.5,
                      }}
                    >
                      Cambia asset
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ASSETS LIST
// ---------------------------------------------------------------------------
function AssetsView({ house, assets, rooms, openAsset, onAddAsset }) {
  return (
    <div style={{ padding: "36px 44px", maxWidth: 980 }}>
      <SectionLabel>{house.code}</SectionLabel>
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 24 }}>
        <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: 26, color: T.ink, margin: 0 }}>
          Asset della casa
        </h1>
        <button
          onClick={() => onAddAsset(null)}
          style={{
            display: "flex", alignItems: "center", gap: 8, background: T.pine, color: "#F7F7F2",
            border: "none", borderRadius: 7, padding: "9px 15px", cursor: "pointer",
            fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 500,
          }}
        >
          + Aggiungi asset
        </button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
        {assets.map((a) => {
          const meta = ASSET_TYPES[a.type];
          const Icon = meta.icon;
          const room = rooms.find((r) => r.id === a.roomId);
          return (
            <div
              key={a.id}
              onClick={() => openAsset(a.id)}
              style={{
                background: T.card, border: `1px solid ${T.line}`, borderRadius: 10,
                padding: "16px 16px", cursor: "pointer", position: "relative",
              }}
            >
              <div style={{
                position: "absolute", top: 14, right: 14, fontFamily: "'IBM Plex Mono', monospace",
                fontSize: 10, color: T.slate, letterSpacing: "0.04em",
              }}>
                {a.code}
              </div>
              <div style={{
                width: 34, height: 34, borderRadius: 8, background: T.paper,
                display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 14,
              }}>
                <Icon size={17} color={meta.color} />
              </div>
              <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 15, fontWeight: 600, color: T.ink, marginBottom: 4 }}>
                {a.name}
              </div>
              <div style={{ marginBottom: 10 }}><StatusDot status={a.status} /></div>
              {room && (
                <div style={{ marginBottom: 10 }}>
                  <Stamp tone="slate">{room.name}</Stamp>
                </div>
              )}
              <div style={{ display: "flex", gap: 14, fontFamily: "'Inter', sans-serif", fontSize: 11.5, color: T.slate }}>
                <span>{a.documents.length} documenti</span>
                <span>{a.timeline.length} eventi</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ASSET DETAIL
// ---------------------------------------------------------------------------
function AssetDetail({ asset, room, rooms, back, openRoom, onChangeRoom, onEdit, onUploadDoc }) {
  const meta = ASSET_TYPES[asset.type];
  const Icon = meta.icon;
  const [docStatus, setDocStatus] = useState("idle"); // idle | analyzing | analyzed
  const [docResult, setDocResult] = useState(null);

  function simulateAssetUpload() {
    setDocStatus("analyzing");
    setTimeout(() => {
      const mock = ASSET_DOC_MOCKS[asset.type] || ASSET_DOC_MOCKS.elettrodomestico;
      setDocResult(mock);
      setDocStatus("analyzed");
    }, 1100);
  }

  function applyDoc(applyFields) {
    onUploadDoc(asset.id, { ...docResult, applyFields });
    setDocStatus("idle");
    setDocResult(null);
  }

  return (
    <div style={{ padding: "36px 44px", maxWidth: 820 }}>
      <button
        onClick={back}
        style={{
          display: "flex", alignItems: "center", gap: 6, background: "none", border: "none",
          cursor: "pointer", color: T.slate, fontFamily: "'Inter', sans-serif", fontSize: 12.5, marginBottom: 20, padding: 0,
        }}
      >
        <ChevronLeft size={14} /> Tutti gli asset
      </button>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 10, background: T.paper,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <Icon size={21} color={meta.color} />
          </div>
          <div>
            <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: 24, color: T.ink, margin: 0 }}>
              {asset.name}
            </h1>
            <div style={{ display: "flex", gap: 12, alignItems: "center", marginTop: 3 }}>
              <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: T.slate }}>{asset.code}</span>
              <StatusDot status={asset.status} />
            </div>
          </div>
        </div>
        <button onClick={onEdit} style={{
          background: "none", border: `1px solid ${T.line}`, color: T.ink, borderRadius: 7,
          padding: "8px 14px", cursor: "pointer", fontFamily: "'Inter', sans-serif", fontSize: 12.5, fontWeight: 500,
          whiteSpace: "nowrap",
        }}>
          Modifica
        </button>
      </div>

      <div style={{ display: "flex", gap: 8, margin: "18px 0 30px 0" }}>
        <Stamp tone={asset.status === "ok" ? "pine" : asset.status === "due" ? "rust" : "ochre"}>
          {asset.status === "ok" ? "Passaporto in regola" : asset.status === "due" ? "Azione richiesta" : "Da completare"}
        </Stamp>
        {asset.warrantyUntil && <Stamp tone="slate">garanzia fino al {asset.warrantyUntil}</Stamp>}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px 24px", marginBottom: 34 }}>
        <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 13 }}>
          <span style={{ color: T.slate }}>Installato il: </span>
          <span style={{ color: T.ink, fontWeight: 500 }}>{asset.installedAt}</span>
        </div>
        <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 13 }}>
          <span style={{ color: T.slate }}>Categoria: </span>
          <span style={{ color: T.ink, fontWeight: 500 }}>{meta.label}</span>
        </div>
        <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 13 }}>
          <span style={{ color: T.slate, display: "block", marginBottom: 5 }}>Ambiente</span>
          <select
            value={asset.roomId || ""}
            onChange={(e) => onChangeRoom(asset.id, e.target.value || null)}
            style={{
              width: "100%", maxWidth: 240, padding: "7px 9px", borderRadius: 6,
              border: `1px solid ${T.line}`, background: T.card, fontFamily: "'Inter', sans-serif",
              fontSize: 12.5, color: T.ink, cursor: "pointer",
            }}
          >
            <option value="">Nessuno — impianto di casa</option>
            {rooms.map((r) => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </select>
          {room && (
            <span
              onClick={() => openRoom(room.id)}
              style={{ fontFamily: "'Inter', sans-serif", fontSize: 11.5, color: T.pine, cursor: "pointer", textDecoration: "underline", marginTop: 5, display: "inline-block" }}
            >
              Apri scheda ambiente →
            </span>
          )}
        </div>
      </div>

      {asset.customFields.length > 0 && (
        <>
          <SectionLabel>Dati aggiuntivi</SectionLabel>
          <div style={{
            display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 20px",
            background: T.card, border: `1px solid ${T.line}`, borderRadius: 8, padding: "12px 16px", marginBottom: 30,
          }}>
            {asset.customFields.map((f) => (
              <div key={f.id} style={{ fontFamily: "'Inter', sans-serif", fontSize: 12.5 }}>
                <span style={{ color: T.slate }}>{f.label}: </span>
                <span style={{ color: T.ink, fontWeight: 500 }}>{f.value}</span>
              </div>
            ))}
          </div>
        </>
      )}

      <SectionLabel>Carica documento per questo asset</SectionLabel>
      <div style={{
        border: `1px dashed ${docStatus === "analyzed" ? T.pine : T.line}`, borderRadius: 9,
        padding: "14px 16px", marginBottom: 30, background: docStatus === "analyzed" ? "#E4EEE9" : T.card,
      }}>
        {docStatus === "idle" && (
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <Upload size={17} color={T.pine} />
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 500, color: T.ink }}>
                Fattura, certificato o manuale?
              </div>
              <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 11.5, color: T.slate }}>
                L'AI legge il documento e propone i dati da aggiungere a questa scheda
              </div>
            </div>
            <button onClick={simulateAssetUpload} style={{
              background: T.pine, color: "#F7F7F2", border: "none", borderRadius: 6,
              padding: "8px 13px", cursor: "pointer", fontFamily: "'Inter', sans-serif",
              fontSize: 12.5, fontWeight: 500, whiteSpace: "nowrap",
            }}>
              Carica file
            </button>
          </div>
        )}
        {docStatus === "analyzing" && (
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Sparkles size={16} color={T.ochreDeep} />
            <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, color: T.ochreDeep }}>
              Analisi del documento in corso…
            </span>
          </div>
        )}
        {docStatus === "analyzed" && docResult && (
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
              <Stamp tone={docResult.confidence > 90 ? "pine" : docResult.confidence > 80 ? "ochre" : "rust"}>
                confidenza {docResult.confidence}%
              </Stamp>
              <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 11.5, color: T.ink70 }}>
                {docResult.docName}
              </span>
            </div>
            <div style={{
              display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 20px",
              background: T.paper, borderRadius: 7, padding: "10px 14px", marginBottom: 14,
            }}>
              {docResult.fields.map(([k, v]) => (
                <div key={k} style={{ fontFamily: "'Inter', sans-serif", fontSize: 12 }}>
                  <span style={{ color: T.slate }}>{k}: </span>
                  <span style={{ color: T.ink, fontWeight: 500 }}>{v}</span>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button onClick={() => applyDoc(true)} style={{
                display: "flex", alignItems: "center", gap: 6, background: T.pine, color: "#F7F7F2",
                border: "none", borderRadius: 6, padding: "8px 13px", cursor: "pointer",
                fontFamily: "'Inter', sans-serif", fontSize: 12.5, fontWeight: 500,
              }}>
                <CheckCircle2 size={13} /> Applica dati alla scheda
              </button>
              <button onClick={() => applyDoc(false)} style={{
                background: "transparent", border: `1px solid ${T.line}`, color: T.ink,
                borderRadius: 6, padding: "8px 13px", cursor: "pointer",
                fontFamily: "'Inter', sans-serif", fontSize: 12.5,
              }}>
                Salva solo il documento
              </button>
            </div>
          </div>
        )}
      </div>

      <SectionLabel>Documenti ({asset.documents.length})</SectionLabel>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 30 }}>
        {asset.documents.length === 0 && (
          <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: T.slate }}>
            Nessun documento collegato ancora.
          </div>
        )}
        {asset.documents.map((d) => (
          <div key={d.id} style={{
            display: "flex", alignItems: "center", gap: 10, background: T.card,
            border: `1px solid ${T.line}`, borderRadius: 8, padding: "10px 14px",
          }}>
            <FileText size={14} color={T.slate} />
            <span style={{ flex: 1, fontFamily: "'Inter', sans-serif", fontSize: 13, color: T.ink }}>{d.name}</span>
            <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10.5, color: T.slate }}>{d.type} · {d.date}</span>
          </div>
        ))}
      </div>

      <SectionLabel>Cronologia</SectionLabel>
      <div style={{ position: "relative", paddingLeft: 18 }}>
        <div style={{ position: "absolute", left: 4, top: 4, bottom: 4, width: 1, background: T.line }} />
        {asset.timeline.map((t, i) => (
          <div key={i} style={{ position: "relative", marginBottom: 16 }}>
            <div style={{
              position: "absolute", left: -18, top: 3, width: 8, height: 8, borderRadius: "50%",
              background: T.pine, border: `2px solid ${T.paper}`,
            }} />
            <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10.5, color: T.slate, marginBottom: 2 }}>
              {t.date}
            </div>
            <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 13.5, fontWeight: 500, color: T.ink }}>
              {t.event}
            </div>
            <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 12.5, color: T.ink70 }}>{t.detail}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ROOMS (AMBIENTI)
// ---------------------------------------------------------------------------
function RoomsView({ house, rooms, assets, openRoom }) {
  return (
    <div style={{ padding: "36px 44px", maxWidth: 980 }}>
      <SectionLabel>{house.code}</SectionLabel>
      <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: 26, color: T.ink, margin: "0 0 8px 0" }}>
        Ambienti della casa
      </h1>
      <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: T.ink70, margin: "0 0 24px 0" }}>
        Le stanze non hanno una loro documentazione: sono il contenitore degli Asset al loro interno.
      </p>

      {rooms.length === 0 && (
        <div style={{
          border: `1px dashed ${T.line}`, borderRadius: 10, padding: "40px 20px",
          textAlign: "center", color: T.slate, fontFamily: "'Inter', sans-serif", fontSize: 13.5,
        }}>
          Nessun ambiente censito ancora.
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
        {rooms.map((r) => {
          const meta = ROOM_TYPES[r.type];
          const Icon = meta.icon;
          const roomAssets = assets.filter((a) => a.roomId === r.id);
          return (
            <div
              key={r.id}
              onClick={() => openRoom(r.id)}
              style={{
                background: T.card, border: `1px solid ${T.line}`, borderRadius: 10,
                padding: "16px 16px", cursor: "pointer", position: "relative",
              }}
            >
              <div style={{
                position: "absolute", top: 14, right: 14, fontFamily: "'IBM Plex Mono', monospace",
                fontSize: 10, color: T.slate, letterSpacing: "0.04em",
              }}>
                {r.code}
              </div>
              <div style={{
                width: 34, height: 34, borderRadius: 8, background: T.paper,
                display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 14,
              }}>
                <Icon size={17} color={meta.color} />
              </div>
              <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 15, fontWeight: 600, color: T.ink, marginBottom: 10 }}>
                {r.name}
              </div>
              <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 11.5, color: T.slate }}>
                {roomAssets.length} asset collegat{roomAssets.length === 1 ? "o" : "i"}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function RoomDetail({ room, assets, back, openAsset, onAddAsset }) {
  const meta = ROOM_TYPES[room.type];
  const Icon = meta.icon;
  const roomAssets = assets.filter((a) => a.roomId === room.id);

  return (
    <div style={{ padding: "36px 44px", maxWidth: 820 }}>
      <button
        onClick={back}
        style={{
          display: "flex", alignItems: "center", gap: 6, background: "none", border: "none",
          cursor: "pointer", color: T.slate, fontFamily: "'Inter', sans-serif", fontSize: 12.5, marginBottom: 20, padding: 0,
        }}
      >
        <ChevronLeft size={14} /> Tutti gli ambienti
      </button>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 10, background: T.paper,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <Icon size={21} color={meta.color} />
          </div>
          <div>
            <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: 24, color: T.ink, margin: 0 }}>
              {room.name}
            </h1>
            <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: T.slate }}>{room.code}</span>
          </div>
        </div>
        <button
          onClick={() => onAddAsset(room.id)}
          style={{
            display: "flex", alignItems: "center", gap: 8, background: T.pine, color: "#F7F7F2",
            border: "none", borderRadius: 7, padding: "9px 15px", cursor: "pointer",
            fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 500, whiteSpace: "nowrap",
          }}
        >
          + Aggiungi asset
        </button>
      </div>

      <SectionLabel>Asset in questo ambiente ({roomAssets.length})</SectionLabel>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {roomAssets.length === 0 && (
          <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: T.slate }}>
            Nessun asset collegato a questo ambiente ancora. Gli elettrodomestici e gli elementi presenti qui potranno essere aggiunti in seguito.
          </div>
        )}
        {roomAssets.map((a) => {
          const assetMeta = ASSET_TYPES[a.type];
          const AssetIcon = assetMeta.icon;
          return (
            <div
              key={a.id}
              onClick={() => openAsset(a.id)}
              style={{
                display: "flex", alignItems: "center", gap: 12, background: T.card,
                border: `1px solid ${T.line}`, borderRadius: 8, padding: "12px 14px", cursor: "pointer",
              }}
            >
              <AssetIcon size={16} color={assetMeta.color} />
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 13.5, fontWeight: 500, color: T.ink }}>
                  {a.name}
                </div>
                <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10.5, color: T.slate }}>{a.code}</div>
              </div>
              <StatusDot status={a.status} />
              <ChevronRight size={15} color={T.slate} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ADD ASSET
// ---------------------------------------------------------------------------
function AddAssetModal({ rooms, defaultRoomId, onCreate, onClose }) {
  const [name, setName] = useState("");
  const [type, setType] = useState("elettrodomestico");
  const [roomId, setRoomId] = useState(defaultRoomId || "");
  const [installedAt, setInstalledAt] = useState("");
  const [warrantyUntil, setWarrantyUntil] = useState("");

  const inputStyle = {
    width: "100%", padding: "10px 12px", borderRadius: 7, border: `1px solid ${T.line}`,
    background: T.card, fontFamily: "'Inter', sans-serif", fontSize: 13.5, color: T.ink,
    boxSizing: "border-box", outline: "none",
  };
  const labelStyle = {
    fontFamily: "'Inter', sans-serif", fontSize: 12, color: T.slate, marginBottom: 6, display: "block",
  };

  function submit() {
    if (!name.trim()) return;
    onCreate({
      name: name.trim(),
      type,
      roomId: roomId || null,
      installedAt: installedAt.trim() || "—",
      warrantyUntil: warrantyUntil.trim() || null,
    });
  }

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(27,36,32,0.55)", zIndex: 50,
      display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
    }}>
      <div style={{ width: 480, maxHeight: "88vh", overflow: "auto", background: T.paper, borderRadius: 14, padding: "28px 30px", position: "relative" }}>
        <button onClick={onClose} style={{
          position: "absolute", top: 18, right: 18, background: "none", border: "none",
          cursor: "pointer", color: T.slate, padding: 4,
        }}>
          <X size={17} />
        </button>

        <SectionLabel>Nuovo asset</SectionLabel>
        <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: 21, color: T.ink, margin: "0 0 20px 0" }}>
          Aggiungi un asset
        </h1>

        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>Nome</label>
          <input style={inputStyle} placeholder="Es. Lavastoviglie Bosch" value={name}
            onChange={(e) => setName(e.target.value)} autoFocus />
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>Categoria</label>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {Object.entries(ASSET_TYPES).map(([key, meta]) => {
              const Icon = meta.icon;
              const active = type === key;
              return (
                <div
                  key={key}
                  onClick={() => setType(key)}
                  style={{
                    display: "flex", alignItems: "center", gap: 8, padding: "9px 11px",
                    borderRadius: 8, border: `1.5px solid ${active ? T.pine : T.line}`,
                    background: active ? "#E4EEE9" : T.card, cursor: "pointer",
                  }}
                >
                  <Icon size={14} color={meta.color} />
                  <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, fontWeight: 500, color: T.ink }}>
                    {meta.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>Ambiente (facoltativo)</label>
          <select
            value={roomId}
            onChange={(e) => setRoomId(e.target.value)}
            style={{ ...inputStyle, appearance: "auto" }}
          >
            <option value="">Nessuno — impianto di casa</option>
            {rooms.map((r) => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </select>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 24 }}>
          <div>
            <label style={labelStyle}>Data installazione</label>
            <input style={inputStyle} placeholder="gg/mm/aaaa" value={installedAt}
              onChange={(e) => setInstalledAt(e.target.value)} />
          </div>
          <div>
            <label style={labelStyle}>Garanzia fino al</label>
            <input style={inputStyle} placeholder="gg/mm/aaaa" value={warrantyUntil}
              onChange={(e) => setWarrantyUntil(e.target.value)} />
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <button onClick={onClose} style={{
            background: "none", border: `1px solid ${T.line}`, color: T.ink, borderRadius: 7,
            padding: "10px 16px", cursor: "pointer", fontFamily: "'Inter', sans-serif", fontSize: 13,
          }}>
            Annulla
          </button>
          <button
            onClick={submit}
            disabled={!name.trim()}
            style={{
              background: name.trim() ? T.pine : T.line, color: name.trim() ? "#F7F7F2" : T.slate,
              border: "none", borderRadius: 7, padding: "10px 18px",
              cursor: name.trim() ? "pointer" : "not-allowed",
              fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 500,
            }}
          >
            Crea asset
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// EDIT ASSET
// ---------------------------------------------------------------------------
function EditAssetModal({ asset, onSave, onClose }) {
  const [name, setName] = useState(asset.name);
  const [installedAt, setInstalledAt] = useState(asset.installedAt === "—" ? "" : asset.installedAt);
  const [warrantyUntil, setWarrantyUntil] = useState(asset.warrantyUntil || "");
  const [fields, setFields] = useState(asset.customFields.map((f) => ({ ...f })));

  const inputStyle = {
    width: "100%", padding: "10px 12px", borderRadius: 7, border: `1px solid ${T.line}`,
    background: T.card, fontFamily: "'Inter', sans-serif", fontSize: 13.5, color: T.ink,
    boxSizing: "border-box", outline: "none",
  };
  const labelStyle = {
    fontFamily: "'Inter', sans-serif", fontSize: 12, color: T.slate, marginBottom: 6, display: "block",
  };

  function updateField(id, key, value) {
    setFields((prev) => prev.map((f) => (f.id === id ? { ...f, [key]: value } : f)));
  }
  function removeField(id) {
    setFields((prev) => prev.filter((f) => f.id !== id));
  }
  function addField() {
    customFieldIdCounter += 1;
    setFields((prev) => [...prev, { id: "c" + customFieldIdCounter, label: "", value: "" }]);
  }

  function submit() {
    onSave(asset.id, {
      name: name.trim() || asset.name,
      installedAt: installedAt.trim() || "—",
      warrantyUntil: warrantyUntil.trim() || null,
      customFields: fields.filter((f) => f.label.trim()),
    });
  }

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(27,36,32,0.55)", zIndex: 50,
      display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
    }}>
      <div style={{ width: 500, maxHeight: "88vh", overflow: "auto", background: T.paper, borderRadius: 14, padding: "28px 30px", position: "relative" }}>
        <button onClick={onClose} style={{
          position: "absolute", top: 18, right: 18, background: "none", border: "none",
          cursor: "pointer", color: T.slate, padding: 4,
        }}>
          <X size={17} />
        </button>

        <SectionLabel>{asset.code}</SectionLabel>
        <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: 21, color: T.ink, margin: "0 0 20px 0" }}>
          Modifica asset
        </h1>

        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>Nome</label>
          <input style={inputStyle} value={name} onChange={(e) => setName(e.target.value)} />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
          <div>
            <label style={labelStyle}>Data installazione</label>
            <input style={inputStyle} placeholder="gg/mm/aaaa" value={installedAt} onChange={(e) => setInstalledAt(e.target.value)} />
          </div>
          <div>
            <label style={labelStyle}>Garanzia fino al</label>
            <input style={inputStyle} placeholder="gg/mm/aaaa" value={warrantyUntil} onChange={(e) => setWarrantyUntil(e.target.value)} />
          </div>
        </div>

        <label style={labelStyle}>Dati aggiuntivi</label>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 10 }}>
          {fields.map((f) => (
            <div key={f.id} style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input
                style={{ ...inputStyle, flex: 1 }} placeholder="Etichetta (es. Fornitore)"
                value={f.label} onChange={(e) => updateField(f.id, "label", e.target.value)}
              />
              <input
                style={{ ...inputStyle, flex: 1.4 }} placeholder="Valore"
                value={f.value} onChange={(e) => updateField(f.id, "value", e.target.value)}
              />
              <button onClick={() => removeField(f.id)} style={{
                background: "none", border: "none", cursor: "pointer", color: T.slate, padding: 4, flexShrink: 0,
              }}>
                <X size={15} />
              </button>
            </div>
          ))}
          {fields.length === 0 && (
            <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 12.5, color: T.slate }}>
              Nessun dato aggiuntivo ancora.
            </div>
          )}
        </div>
        <button onClick={addField} style={{
          background: "none", border: `1px dashed ${T.line}`, color: T.pine, borderRadius: 7,
          padding: "8px 12px", cursor: "pointer", fontFamily: "'Inter', sans-serif", fontSize: 12.5,
          fontWeight: 500, marginBottom: 24, width: "100%",
        }}>
          + Aggiungi campo
        </button>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <button onClick={onClose} style={{
            background: "none", border: `1px solid ${T.line}`, color: T.ink, borderRadius: 7,
            padding: "10px 16px", cursor: "pointer", fontFamily: "'Inter', sans-serif", fontSize: 13,
          }}>
            Annulla
          </button>
          <button onClick={submit} style={{
            background: T.pine, color: "#F7F7F2", border: "none", borderRadius: 7, padding: "10px 18px",
            cursor: "pointer", fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 500,
          }}>
            Salva modifiche
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// FLOOR PLAN (drag & drop)
// ---------------------------------------------------------------------------
function AssetMarker({ asset, style, onMouseDown, dimmed }) {
  const meta = ASSET_TYPES[asset.type];
  const Icon = meta.icon;
  return (
    <div
      onMouseDown={onMouseDown}
      title={asset.name}
      style={{
        position: "absolute", transform: "translate(-50%, -50%)", cursor: "grab",
        width: 30, height: 30, borderRadius: "50%", background: T.card,
        border: `2px solid ${meta.color}`, display: "flex", alignItems: "center", justifyContent: "center",
        boxShadow: "0 1px 3px rgba(27,36,32,0.18)", opacity: dimmed ? 0.35 : 1,
        userSelect: "none", zIndex: 2, ...style,
      }}
    >
      <Icon size={14} color={meta.color} />
    </div>
  );
}

function FloorPlanView({ house, rooms, assets, openAsset, onMoveAsset }) {
  const gridRef = useRef(null);
  const trayRef = useRef(null);
  const [drag, setDrag] = useState(null); // { assetId, startX, startY, moved, clientX, clientY }
  const [hover, setHover] = useState(null); // { kind: 'room'|'tray', id }

  const cols = rooms.length <= 1 ? 1 : Math.ceil(Math.sqrt(rooms.length));
  const rows = rooms.length === 0 ? 1 : Math.ceil(rooms.length / cols);

  function computeHover(clientX, clientY) {
    if (gridRef.current) {
      const rect = gridRef.current.getBoundingClientRect();
      if (clientX >= rect.left && clientX <= rect.right && clientY >= rect.top && clientY <= rect.bottom) {
        const relX = (clientX - rect.left) / rect.width;
        const relY = (clientY - rect.top) / rect.height;
        const col = Math.min(cols - 1, Math.floor(relX * cols));
        const row = Math.min(rows - 1, Math.floor(relY * rows));
        const idx = row * cols + col;
        if (idx < rooms.length) {
          const cellX = relX * cols - col;
          const cellY = relY * rows - row;
          return { kind: "room", id: rooms[idx].id, pos: { x: cellX, y: cellY } };
        }
      }
    }
    if (trayRef.current) {
      const rect = trayRef.current.getBoundingClientRect();
      if (clientX >= rect.left && clientX <= rect.right && clientY >= rect.top && clientY <= rect.bottom) {
        const relX = (clientX - rect.left) / rect.width;
        const relY = (clientY - rect.top) / rect.height;
        return { kind: "tray", id: null, pos: { x: relX, y: relY } };
      }
    }
    return null;
  }

  function startDrag(assetId, e) {
    e.preventDefault();
    const startX = e.clientX, startY = e.clientY;
    setDrag({ assetId, startX, startY, moved: false, clientX: startX, clientY: startY });

    function onMove(ev) {
      const dx = Math.abs(ev.clientX - startX), dy = Math.abs(ev.clientY - startY);
      setDrag((d) => (d ? { ...d, clientX: ev.clientX, clientY: ev.clientY, moved: d.moved || dx > 4 || dy > 4 } : d));
      const h = computeHover(ev.clientX, ev.clientY);
      setHover(h ? { kind: h.kind, id: h.id } : null);
    }
    function onUp(ev) {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      const dx = Math.abs(ev.clientX - startX), dy = Math.abs(ev.clientY - startY);
      const wasClick = dx <= 4 && dy <= 4;
      if (wasClick) {
        openAsset(assetId);
      } else {
        const h = computeHover(ev.clientX, ev.clientY);
        if (h) {
          onMoveAsset(assetId, { roomId: h.kind === "room" ? h.id : null, pos: h.pos });
        }
      }
      setDrag(null);
      setHover(null);
    }
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }

  const draggedAsset = drag ? assets.find((a) => a.id === drag.assetId) : null;
  const trayAssets = assets.filter((a) => !a.roomId);

  return (
    <div style={{ padding: "36px 44px", maxWidth: 980 }}>
      <SectionLabel>{house.code}</SectionLabel>
      <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: 26, color: T.ink, margin: "0 0 8px 0" }}>
        Planimetria
      </h1>
      <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: T.ink70, margin: "0 0 24px 0" }}>
        Trascina un asset per spostarlo di posizione o cambiarne l'ambiente. Un clic apre la scheda.
      </p>

      {rooms.length === 0 ? (
        <div style={{
          border: `1px dashed ${T.line}`, borderRadius: 10, padding: "40px 20px",
          textAlign: "center", color: T.slate, fontFamily: "'Inter', sans-serif", fontSize: 13.5, marginBottom: 20,
        }}>
          Aggiungi almeno un ambiente per generare la planimetria.
        </div>
      ) : (
        <div
          ref={gridRef}
          style={{
            display: "grid", gridTemplateColumns: `repeat(${cols}, 1fr)`, gridTemplateRows: `repeat(${rows}, 150px)`,
            gap: 3, background: T.ink, border: `3px solid ${T.ink}`, borderRadius: 4, marginBottom: 18, overflow: "hidden",
          }}
        >
          {rooms.map((r) => {
            const meta = ROOM_TYPES[r.type];
            const Icon = meta.icon;
            const isHover = hover && hover.kind === "room" && hover.id === r.id;
            const roomAssets = assets.filter((a) => a.roomId === r.id && a.id !== (drag && drag.assetId));
            return (
              <div
                key={r.id}
                style={{
                  position: "relative", background: isHover ? "#E4EEE9" : T.paper,
                  backgroundImage: `linear-gradient(${T.line} 1px, transparent 1px), linear-gradient(90deg, ${T.line} 1px, transparent 1px)`,
                  backgroundSize: "12px 12px", transition: "background 0.1s ease",
                }}
              >
                <div style={{
                  position: "absolute", top: 8, left: 9, display: "flex", alignItems: "center", gap: 6,
                  fontFamily: "'IBM Plex Mono', monospace", fontSize: 10.5, color: T.slate, letterSpacing: "0.03em",
                }}>
                  <Icon size={12} color={meta.color} /> {r.name.toUpperCase()}
                </div>
                {roomAssets.map((a) => (
                  <AssetMarker
                    key={a.id}
                    asset={a}
                    onMouseDown={(e) => startDrag(a.id, e)}
                    style={{ left: `${(a.pos?.x ?? 0.5) * 100}%`, top: `${(a.pos?.y ?? 0.5) * 100}%` }}
                  />
                ))}
              </div>
            );
          })}
        </div>
      )}

      <div
        ref={trayRef}
        style={{
          position: "relative", minHeight: 100, borderRadius: 10,
          border: `1.5px dashed ${hover && hover.kind === "tray" ? T.pine : T.line}`,
          background: hover && hover.kind === "tray" ? "#E4EEE9" : T.card, padding: "10px 14px",
        }}
      >
        <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10.5, color: T.slate, letterSpacing: "0.04em", marginBottom: 4 }}>
          IMPIANTI DI CASA — nessun ambiente specifico
        </div>
        {trayAssets.filter((a) => a.id !== (drag && drag.assetId)).map((a) => (
          <AssetMarker
            key={a.id}
            asset={a}
            onMouseDown={(e) => startDrag(a.id, e)}
            style={{ left: `${(a.pos?.x ?? 0.5) * 100}%`, top: `${((a.pos?.y ?? 0.5) * 0.55 + 0.35) * 100}%` }}
          />
        ))}
      </div>

      {draggedAsset && drag && drag.moved && (
        <AssetMarker
          asset={draggedAsset}
          style={{ left: drag.clientX, top: drag.clientY, position: "fixed", transform: "translate(-50%, -50%)", zIndex: 60, pointerEvents: "none", boxShadow: "0 4px 14px rgba(27,36,32,0.3)" }}
          onMouseDown={() => {}}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// ONBOARDING
// ---------------------------------------------------------------------------
function Onboarding({ onComplete, onLoadDemo }) {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({ name: "", city: "", surface: "", rooms: "", year: "" });
  const [selectedRoomTypes, setSelectedRoomTypes] = useState([]);
  const [selectedAssetTypes, setSelectedAssetTypes] = useState([]);
  const [planStatus, setPlanStatus] = useState("idle"); // idle | analyzing | done
  const [planResult, setPlanResult] = useState(null);

  function toggleRoomType(key) {
    setSelectedRoomTypes((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
  }
  function toggleAssetType(key) {
    setSelectedAssetTypes((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
  }

  function simulatePlanUpload() {
    setPlanStatus("analyzing");
    setTimeout(() => {
      const result = {
        surface: 118,
        rooms: 4,
        elements: [
          { label: "Cucina", kind: "room", key: "cucina" },
          { label: "Soggiorno", kind: "room", key: "soggiorno" },
          { label: "Camera da letto", kind: "room", key: "camera" },
          { label: "Bagno", kind: "room", key: "bagno" },
          { label: "Impianto elettrico rilevato", kind: "asset", key: "elettrico" },
        ],
      };
      setForm((f) => ({ ...f, surface: String(result.surface), rooms: String(result.rooms) }));
      setPlanResult(result);
      setPlanStatus("done");
    }, 1300);
  }

  function goToStep2() {
    if (planResult) {
      const roomKeys = planResult.elements.filter((e) => e.kind === "room").map((e) => e.key);
      const assetKeys = planResult.elements.filter((e) => e.kind === "asset").map((e) => e.key);
      setSelectedRoomTypes((prev) => Array.from(new Set([...prev, ...roomKeys])));
      setSelectedAssetTypes((prev) => Array.from(new Set([...prev, ...assetKeys])));
    }
    setStep(2);
  }

  function finish() {
    const house = {
      name: form.name || "Casa senza nome",
      city: form.city || "—",
      surface: form.surface || "—",
      rooms: form.rooms || "—",
      year: form.year || "—",
      code: makeHouseCode(),
    };
    const rooms = selectedRoomTypes.map((type, i) => ({
      id: "ur" + (i + 1),
      code: makeRoomCode(i),
      type,
      name: ROOM_TYPES[type].label,
    }));
    const assets = selectedAssetTypes.map((type, i) => ({
      id: "u" + (i + 1),
      code: `AST—${String(i + 1).padStart(3, "0")}`,
      type,
      name: ASSET_TYPES[type].label,
      roomId: null,
      pos: defaultPos(i),
      installedAt: "—",
      warrantyUntil: null,
      status: "attention",
      customFields: [],
      documents: [],
      timeline: [{ date: "oggi", event: "Asset creato", detail: "Aggiunto durante la configurazione iniziale" }],
    }));
    onComplete(house, rooms, assets);
  }

  const inputStyle = {
    width: "100%", padding: "10px 12px", borderRadius: 7, border: `1px solid ${T.line}`,
    background: T.card, fontFamily: "'Inter', sans-serif", fontSize: 13.5, color: T.ink,
    boxSizing: "border-box", outline: "none",
  };
  const labelStyle = {
    fontFamily: "'Inter', sans-serif", fontSize: 12, color: T.slate, marginBottom: 6, display: "block",
  };

  return (
    <div style={{ minHeight: "100vh", background: T.ink, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <style>{FONTS}</style>
      <div style={{ width: 520, background: T.paper, borderRadius: 14, padding: "36px 38px", position: "relative" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 22 }}>
          <div style={{ width: 26, height: 26, borderRadius: 6, background: T.pine, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Home size={15} color="#F1F1EC" />
          </div>
          <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: 16, color: T.ink }}>HomeOS</span>
        </div>

        <div style={{ display: "flex", gap: 6, marginBottom: 24 }}>
          {[1, 2].map((s) => (
            <div key={s} style={{ flex: 1, height: 3, borderRadius: 2, background: step >= s ? T.pine : T.line }} />
          ))}
        </div>

        {step === 1 && (
          <>
            <SectionLabel>Passo 1 di 2</SectionLabel>
            <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: 22, color: T.ink, margin: "0 0 4px 0" }}>
              Crea la tua casa
            </h1>
            <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: T.ink70, margin: "0 0 22px 0" }}>
              Il punto di partenza del tuo Digital Twin.
            </p>

            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>Indirizzo</label>
              <input style={inputStyle} placeholder="Via dei Glicini 14" value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 18 }}>
              <div>
                <label style={labelStyle}>Città</label>
                <input style={inputStyle} placeholder="Milano" value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })} />
              </div>
              <div>
                <label style={labelStyle}>Anno di costruzione (facoltativo)</label>
                <input style={inputStyle} placeholder="2010" value={form.year}
                  onChange={(e) => setForm({ ...form, year: e.target.value })} />
              </div>
            </div>

            <div style={{
              border: `1px dashed ${planStatus === "done" ? T.pine : T.line}`, borderRadius: 9,
              padding: "14px 16px", marginBottom: 20, background: planStatus === "done" ? "#E4EEE9" : T.card,
            }}>
              {planStatus === "idle" && (
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <Upload size={17} color={T.pine} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 500, color: T.ink }}>
                      Carica la planimetria
                    </div>
                    <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 11.5, color: T.slate }}>
                      Calcoliamo superficie, locali e ambienti automaticamente
                    </div>
                  </div>
                  <button onClick={simulatePlanUpload} style={{
                    background: T.pine, color: "#F7F7F2", border: "none", borderRadius: 6,
                    padding: "8px 13px", cursor: "pointer", fontFamily: "'Inter', sans-serif",
                    fontSize: 12.5, fontWeight: 500, whiteSpace: "nowrap",
                  }}>
                    Carica file
                  </button>
                </div>
              )}
              {planStatus === "analyzing" && (
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <Sparkles size={16} color={T.ochreDeep} />
                  <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, color: T.ochreDeep }}>
                    Lettura planimetria in corso…
                  </span>
                </div>
              )}
              {planStatus === "done" && planResult && (
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                    <Stamp tone="pine">planimetria analizzata</Stamp>
                    <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 11.5, color: T.ink70 }}>
                      Planimetria_Casa.pdf
                    </span>
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {planResult.elements.map((el) => (
                      <span key={el.label} style={{
                        fontFamily: "'Inter', sans-serif", fontSize: 11.5, color: T.ink,
                        background: T.paper, border: `1px solid ${T.line}`, borderRadius: 5, padding: "4px 9px",
                      }}>
                        {el.label}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 26 }}>
              <div>
                <label style={labelStyle}>Superficie (m²){planStatus === "done" ? " — da planimetria" : ""}</label>
                <input style={inputStyle} placeholder="120" value={form.surface}
                  onChange={(e) => setForm({ ...form, surface: e.target.value })} />
              </div>
              <div>
                <label style={labelStyle}>Locali{planStatus === "done" ? " — da planimetria" : ""}</label>
                <input style={inputStyle} placeholder="4" value={form.rooms}
                  onChange={(e) => setForm({ ...form, rooms: e.target.value })} />
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <button onClick={onLoadDemo} style={{
                background: "none", border: "none", cursor: "pointer", color: T.slate,
                fontFamily: "'Inter', sans-serif", fontSize: 12.5, padding: 0,
              }}>
                Carica dati di esempio
              </button>
              <button
                onClick={goToStep2}
                disabled={!form.name}
                style={{
                  display: "flex", alignItems: "center", gap: 6, background: form.name ? T.pine : T.line,
                  color: form.name ? "#F7F7F2" : T.slate, border: "none", borderRadius: 7,
                  padding: "10px 18px", cursor: form.name ? "pointer" : "not-allowed",
                  fontFamily: "'Inter', sans-serif", fontSize: 13.5, fontWeight: 500,
                }}
              >
                Continua <ChevronRight size={14} />
              </button>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <SectionLabel>Passo 2 di 2</SectionLabel>
            <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: 22, color: T.ink, margin: "0 0 4px 0" }}>
              Ambienti e impianti principali
            </h1>
            <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: T.ink70, margin: "0 0 20px 0" }}>
              Gli ambienti sono le stanze; gli impianti sono gli Asset veri e propri, con documenti e scadenze.
              {planResult && " Quelli rilevati dalla planimetria sono già selezionati."}
            </p>

            <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 11.5, fontWeight: 600, color: T.slate, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 8 }}>
              Ambienti
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20 }}>
              {Object.entries(ROOM_TYPES).map(([key, meta]) => {
                const Icon = meta.icon;
                const active = selectedRoomTypes.includes(key);
                return (
                  <div
                    key={key}
                    onClick={() => toggleRoomType(key)}
                    style={{
                      display: "flex", alignItems: "center", gap: 10, padding: "12px 13px",
                      borderRadius: 9, border: `1.5px solid ${active ? T.pine : T.line}`,
                      background: active ? "#E4EEE9" : T.card, cursor: "pointer",
                    }}
                  >
                    <Icon size={16} color={meta.color} />
                    <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 12.5, fontWeight: 500, color: T.ink, flex: 1 }}>
                      {meta.label}
                    </span>
                    {active && <CheckCircle2 size={15} color={T.pine} />}
                  </div>
                );
              })}
            </div>

            <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 11.5, fontWeight: 600, color: T.slate, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 8 }}>
              Impianti principali
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 26 }}>
              {STRUCTURAL_ASSET_KEYS.map((key) => {
                const meta = ASSET_TYPES[key];
                const Icon = meta.icon;
                const active = selectedAssetTypes.includes(key);
                return (
                  <div
                    key={key}
                    onClick={() => toggleAssetType(key)}
                    style={{
                      display: "flex", alignItems: "center", gap: 10, padding: "12px 13px",
                      borderRadius: 9, border: `1.5px solid ${active ? T.pine : T.line}`,
                      background: active ? "#E4EEE9" : T.card, cursor: "pointer",
                    }}
                  >
                    <Icon size={16} color={meta.color} />
                    <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 12.5, fontWeight: 500, color: T.ink, flex: 1 }}>
                      {meta.label}
                    </span>
                    {active && <CheckCircle2 size={15} color={T.pine} />}
                  </div>
                );
              })}
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <button onClick={() => setStep(1)} style={{
                display: "flex", alignItems: "center", gap: 6, background: "none", border: "none",
                cursor: "pointer", color: T.slate, fontFamily: "'Inter', sans-serif", fontSize: 12.5, padding: 0,
              }}>
                <ChevronLeft size={14} /> Indietro
              </button>
              <button
                onClick={finish}
                style={{
                  display: "flex", alignItems: "center", gap: 6, background: T.pine, color: "#F7F7F2",
                  border: "none", borderRadius: 7, padding: "10px 18px", cursor: "pointer",
                  fontFamily: "'Inter', sans-serif", fontSize: 13.5, fontWeight: 500,
                }}
              >
                Crea la mia casa <ChevronRight size={14} />
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// USER TESTING: welcome, guided task checklist, feedback
// ---------------------------------------------------------------------------
const TEST_TASKS = [
  { key: "houseCreated", label: "Crea la tua casa e i primi ambienti/impianti" },
  { key: "addedAsset", label: "Aggiungi un nuovo asset (es. un elettrodomestico)" },
  { key: "movedAsset", label: "Vai su Planimetria e sposta un asset in un altro ambiente" },
  { key: "editedAsset", label: "Apri un asset e modifica/aggiungi un dato manualmente" },
  { key: "appliedDoc", label: "Carica un documento nell'Inbox e applica i dati a un asset" },
];

function WelcomeScreen({ onStart }) {
  return (
    <div style={{ minHeight: "100vh", background: T.ink, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <style>{FONTS}</style>
      <div style={{ width: 540, background: T.paper, borderRadius: 14, padding: "40px 40px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 22 }}>
          <div style={{ width: 26, height: 26, borderRadius: 6, background: T.pine, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Home size={15} color="#F1F1EC" />
          </div>
          <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: 16, color: T.ink }}>HomeOS</span>
        </div>

        <Stamp tone="ochre">prototipo — test utente</Stamp>

        <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: 24, color: T.ink, margin: "16px 0 12px 0" }}>
          Grazie per provare HomeOS
        </h1>
        <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 13.5, color: T.ink70, lineHeight: 1.6, margin: "0 0 16px 0" }}>
          HomeOS è il "sistema operativo della casa": raccoglie documenti, garanzie e interventi e li collega
          agli elementi reali dell'immobile — caldaia, impianto elettrico, elettrodomestici — così non li perdi più.
        </p>
        <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 13.5, color: T.ink70, lineHeight: 1.6, margin: "0 0 24px 0" }}>
          Quello che stai per usare è un prototipo cliccabile, non il prodotto finito: alcuni dati sono simulati.
          Durante il test troverai una lista di cose da provare in basso a destra — seguila con calma,
          esplora liberamente, e alla fine ti chiediamo due minuti di feedback.
        </p>

        <button
          onClick={onStart}
          style={{
            display: "flex", alignItems: "center", gap: 8, background: T.pine, color: "#F7F7F2",
            border: "none", borderRadius: 7, padding: "11px 20px", cursor: "pointer",
            fontFamily: "'Inter', sans-serif", fontSize: 13.5, fontWeight: 500,
          }}
        >
          Inizia il test <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}

function TaskChecklist({ progress, onOpenFeedback, minimized, setMinimized }) {
  const done = TEST_TASKS.filter((t) => progress[t.key]).length;

  if (minimized) {
    return (
      <button
        onClick={() => setMinimized(false)}
        style={{
          position: "fixed", bottom: 20, right: 20, zIndex: 40,
          background: T.ink, color: "#F1F1EC", border: "none", borderRadius: 24,
          padding: "10px 16px", cursor: "pointer", display: "flex", alignItems: "center", gap: 8,
          fontFamily: "'Inter', sans-serif", fontSize: 12.5, fontWeight: 500,
          boxShadow: "0 4px 14px rgba(27,36,32,0.3)",
        }}
      >
        <CheckCircle2 size={14} color={T.pine} /> Da provare ({done}/{TEST_TASKS.length})
      </button>
    );
  }

  return (
    <div style={{
      position: "fixed", bottom: 20, right: 20, width: 290, zIndex: 40,
      background: T.card, border: `1px solid ${T.line}`, borderRadius: 12,
      padding: "16px 16px", boxShadow: "0 8px 24px rgba(27,36,32,0.22)",
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10.5, letterSpacing: "0.05em", color: T.slate, textTransform: "uppercase" }}>
          Da provare ({done}/{TEST_TASKS.length})
        </span>
        <button onClick={() => setMinimized(true)} style={{ background: "none", border: "none", cursor: "pointer", color: T.slate, padding: 2 }}>
          <ChevronRight size={14} />
        </button>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>
        {TEST_TASKS.map((t) => (
          <div key={t.key} style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
            <div style={{
              width: 15, height: 15, borderRadius: 4, marginTop: 1, flexShrink: 0,
              border: `1.5px solid ${progress[t.key] ? T.pine : T.line}`,
              background: progress[t.key] ? T.pine : "transparent",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              {progress[t.key] && <CheckCircle2 size={11} color="#F7F7F2" />}
            </div>
            <span style={{
              fontFamily: "'Inter', sans-serif", fontSize: 12, lineHeight: 1.4,
              color: progress[t.key] ? T.slate : T.ink,
              textDecoration: progress[t.key] ? "line-through" : "none",
            }}>
              {t.label}
            </span>
          </div>
        ))}
      </div>
      <button
        onClick={onOpenFeedback}
        style={{
          width: "100%", background: T.pine, color: "#F7F7F2", border: "none", borderRadius: 7,
          padding: "9px 12px", cursor: "pointer", fontFamily: "'Inter', sans-serif", fontSize: 12.5, fontWeight: 500,
        }}
      >
        Lascia un feedback
      </button>
    </div>
  );
}

function FeedbackModal({ onClose, onSubmitted }) {
  const [rating, setRating] = useState(0);
  const [liked, setLiked] = useState("");
  const [confusing, setConfusing] = useState("");
  const [name, setName] = useState("");
  const [status, setStatus] = useState("form"); // form | saving | done | error

  const inputStyle = {
    width: "100%", padding: "10px 12px", borderRadius: 7, border: `1px solid ${T.line}`,
    background: T.card, fontFamily: "'Inter', sans-serif", fontSize: 13.5, color: T.ink,
    boxSizing: "border-box", outline: "none", resize: "vertical",
  };
  const labelStyle = { fontFamily: "'Inter', sans-serif", fontSize: 12, color: T.slate, marginBottom: 6, display: "block" };

  async function submit() {
    setStatus("saving");
    const entry = {
      rating, liked: liked.trim(), confusing: confusing.trim(),
      name: name.trim() || "Anonimo", ts: new Date().toISOString(),
    };
    try {
      await window.storage.set("feedback:" + Date.now() + ":" + Math.floor(Math.random() * 1000), JSON.stringify(entry), true);
      setStatus("done");
      onSubmitted();
    } catch (e) {
      setStatus("error");
    }
  }

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(27,36,32,0.55)", zIndex: 55,
      display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
    }}>
      <div style={{ width: 460, background: T.paper, borderRadius: 14, padding: "28px 30px", position: "relative" }}>
        <button onClick={onClose} style={{ position: "absolute", top: 18, right: 18, background: "none", border: "none", cursor: "pointer", color: T.slate }}>
          <X size={17} />
        </button>

        {status === "done" ? (
          <div style={{ textAlign: "center", padding: "20px 0" }}>
            <CheckCircle2 size={32} color={T.pine} style={{ marginBottom: 12 }} />
            <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: 19, color: T.ink, margin: "0 0 8px 0" }}>
              Grazie mille!
            </h1>
            <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: T.ink70, margin: "0 0 20px 0" }}>
              Il tuo feedback è stato registrato ed è prezioso per migliorare HomeOS.
            </p>
            <button onClick={onClose} style={{
              background: T.pine, color: "#F7F7F2", border: "none", borderRadius: 7,
              padding: "9px 18px", cursor: "pointer", fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 500,
            }}>
              Continua a esplorare
            </button>
          </div>
        ) : (
          <>
            <SectionLabel>Feedback del test</SectionLabel>
            <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: 21, color: T.ink, margin: "0 0 20px 0" }}>
              Com'è andata?
            </h1>

            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Quanto ti è sembrato chiaro e utile HomeOS?</label>
              <div style={{ display: "flex", gap: 6 }}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    onClick={() => setRating(n)}
                    style={{
                      flex: 1, padding: "10px 0", borderRadius: 7, cursor: "pointer",
                      border: `1.5px solid ${rating === n ? T.pine : T.line}`,
                      background: rating === n ? "#E4EEE9" : T.card,
                      fontFamily: "'Space Grotesk', sans-serif", fontSize: 14, fontWeight: 600,
                      color: rating === n ? T.pine : T.ink,
                    }}
                  >
                    {n}
                  </button>
                ))}
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontFamily: "'Inter', sans-serif", fontSize: 10.5, color: T.slate, marginTop: 4 }}>
                <span>poco chiaro</span><span>molto chiaro</span>
              </div>
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>Cosa ti è piaciuto o sembrato utile?</label>
              <textarea style={{ ...inputStyle, minHeight: 60 }} value={liked} onChange={(e) => setLiked(e.target.value)} />
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>Cosa ti ha confuso o non ti ha convinto?</label>
              <textarea style={{ ...inputStyle, minHeight: 60 }} value={confusing} onChange={(e) => setConfusing(e.target.value)} />
            </div>
            <div style={{ marginBottom: 22 }}>
              <label style={labelStyle}>Nome (facoltativo)</label>
              <input style={inputStyle} value={name} onChange={(e) => setName(e.target.value)} />
            </div>

            {status === "error" && (
              <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: T.rust, marginBottom: 12 }}>
                Non è stato possibile salvare il feedback. Riprova.
              </div>
            )}

            <button
              onClick={submit}
              disabled={rating === 0 || status === "saving"}
              style={{
                width: "100%", background: rating === 0 ? T.line : T.pine, color: rating === 0 ? T.slate : "#F7F7F2",
                border: "none", borderRadius: 7, padding: "11px 18px",
                cursor: rating === 0 ? "not-allowed" : "pointer",
                fontFamily: "'Inter', sans-serif", fontSize: 13.5, fontWeight: 500,
              }}
            >
              {status === "saving" ? "Invio…" : "Invia feedback"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function FeedbackSummaryView({ onClose }) {
  const [status, setStatus] = useState("loading"); // loading | done | error
  const [entries, setEntries] = useState([]);

  React.useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const list = await window.storage.list("feedback:", true);
        const keys = (list && list.keys) || [];
        const results = [];
        for (const k of keys) {
          try {
            const r = await window.storage.get(k, true);
            if (r && r.value) results.push(JSON.parse(r.value));
          } catch (e) { /* skip unreadable entry */ }
        }
        results.sort((a, b) => (a.ts < b.ts ? 1 : -1));
        if (!cancelled) { setEntries(results); setStatus("done"); }
      } catch (e) {
        if (!cancelled) setStatus("error");
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  const avg = entries.length ? (entries.reduce((s, e) => s + (e.rating || 0), 0) / entries.length).toFixed(1) : "—";

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(27,36,32,0.55)", zIndex: 55,
      display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
    }}>
      <div style={{ width: 560, maxHeight: "85vh", overflow: "auto", background: T.paper, borderRadius: 14, padding: "28px 30px", position: "relative" }}>
        <button onClick={onClose} style={{ position: "absolute", top: 18, right: 18, background: "none", border: "none", cursor: "pointer", color: T.slate }}>
          <X size={17} />
        </button>
        <SectionLabel>Riepilogo — visibile a chi apre questo prototipo</SectionLabel>
        <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: 21, color: T.ink, margin: "0 0 16px 0" }}>
          Feedback ricevuti {entries.length > 0 && `— media ${avg}/5`}
        </h1>

        {status === "loading" && (
          <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: T.slate }}>Caricamento…</div>
        )}
        {status === "error" && (
          <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: T.rust }}>Impossibile caricare i feedback.</div>
        )}
        {status === "done" && entries.length === 0 && (
          <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: T.slate }}>Nessun feedback ricevuto ancora.</div>
        )}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {entries.map((e, i) => (
            <div key={i} style={{ background: T.card, border: `1px solid ${T.line}`, borderRadius: 8, padding: "12px 14px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                <Stamp tone={e.rating >= 4 ? "pine" : e.rating >= 3 ? "ochre" : "rust"}>{e.rating}/5</Stamp>
                <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, fontWeight: 500, color: T.ink }}>{e.name}</span>
              </div>
              {e.liked && (
                <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 12.5, color: T.ink, marginBottom: 4 }}>
                  <span style={{ color: T.slate }}>Piaciuto: </span>{e.liked}
                </div>
              )}
              {e.confusing && (
                <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 12.5, color: T.ink }}>
                  <span style={{ color: T.slate }}>Confuso: </span>{e.confusing}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// APP
// ---------------------------------------------------------------------------
export default function App() {
  const [testStarted, setTestStarted] = useState(false);
  const [checklistMinimized, setChecklistMinimized] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [feedbackSummaryOpen, setFeedbackSummaryOpen] = useState(false);
  const [progress, setProgress] = useState({
    houseCreated: false, addedAsset: false, movedAsset: false, editedAsset: false, appliedDoc: false,
  });
  const [house, setHouse] = useState(null);
  const [view, setView] = useState("dashboard");
  const [rooms, setRooms] = useState([]);
  const [assets, setAssets] = useState([]);
  const [inbox, setInbox] = useState([]);
  const [selectedAssetId, setSelectedAssetId] = useState(null);
  const [selectedRoomId, setSelectedRoomId] = useState(null);
  const [addAssetOpen, setAddAssetOpen] = useState(false);
  const [addAssetRoomId, setAddAssetRoomId] = useState(null);
  const [editAssetId, setEditAssetId] = useState(null);

  function markDone(key) {
    setProgress((prev) => (prev[key] ? prev : { ...prev, [key]: true }));
  }

  function openAsset(id) {
    setSelectedAssetId(id);
    setView("asset-detail");
  }
  function openRoom(id) {
    setSelectedRoomId(id);
    setView("room-detail");
  }
  function openAddAsset(presetRoomId) {
    setAddAssetRoomId(presetRoomId || null);
    setAddAssetOpen(true);
  }
  function createAsset(data) {
    const zoneCount = assets.filter((a) => (data.roomId ? a.roomId === data.roomId : !a.roomId)).length;
    const newAsset = {
      id: "m" + Date.now(),
      code: `AST—${String(assets.length + 1).padStart(3, "0")}`,
      type: data.type,
      name: data.name,
      roomId: data.roomId,
      pos: defaultPos(zoneCount),
      installedAt: data.installedAt,
      warrantyUntil: data.warrantyUntil,
      status: "attention",
      customFields: [],
      documents: [],
      timeline: [{ date: "oggi", event: "Asset creato", detail: "Aggiunto manualmente" }],
    };
    setAssets((prev) => [...prev, newAsset]);
    markDone("addedAsset");
    setAddAssetOpen(false);
  }

  // Called from the Inbox when a document implies an asset type that doesn't exist yet in the house
  // (e.g. a certificate for "impianto elettrico" with no such asset on record). Creates it as a
  // whole-house asset — not tied to a room, since a document alone doesn't tell us which room —
  // and returns its id synchronously so the caller can immediately link the document to it.
  function createAssetForType(type) {
    const zoneCount = assets.filter((a) => !a.roomId).length;
    const newId = "auto" + Date.now();
    const newAsset = {
      id: newId,
      code: `AST—${String(assets.length + 1).padStart(3, "0")}`,
      type,
      name: ASSET_TYPES[type].label,
      roomId: null,
      pos: defaultPos(zoneCount),
      installedAt: "—",
      warrantyUntil: null,
      status: "attention",
      customFields: [],
      documents: [],
      timeline: [{ date: "oggi", event: "Asset creato automaticamente", detail: "Generato da un documento in Inbox non riconducibile a un asset esistente" }],
    };
    setAssets((prev) => [...prev, newAsset]);
    markDone("addedAsset");
    return newId;
  }

  function saveAssetEdits(assetId, data) {
    setAssets((prev) => prev.map((a) => (a.id === assetId ? {
      ...a,
      name: data.name,
      installedAt: data.installedAt,
      warrantyUntil: data.warrantyUntil,
      customFields: data.customFields,
      timeline: [{ date: "oggi", event: "Scheda modificata", detail: "Aggiornati i dati dell'asset" }, ...a.timeline],
    } : a)));
    setEditAssetId(null);
    markDone("editedAsset");
  }

  function applyDocToAsset(assetId, doc) {
    setAssets((prev) => prev.map((a) => {
      if (a.id !== assetId) return a;
      const newDoc = { id: "d" + Date.now(), name: doc.docName, type: doc.fields?.[0]?.[0] || "Documento", date: "oggi" };
      const patch = doc.applyFields ? applyFieldsToAsset(a, doc.fields) : {};
      return {
        ...a,
        ...patch,
        documents: [...a.documents, newDoc],
        timeline: [{ date: "oggi", event: doc.applyFields ? "Documento collegato e dati aggiornati" : "Documento collegato", detail: doc.docName }, ...a.timeline],
      };
    }));
    if (doc.applyFields) markDone("appliedDoc");
  }

  function moveAssetOnPlan(assetId, target) {
    setAssets((prev) => prev.map((a) => {
      if (a.id !== assetId) return a;
      const roomChanged = a.roomId !== target.roomId;
      if (!roomChanged) {
        return { ...a, pos: target.pos };
      }
      const newRoom = rooms.find((r) => r.id === target.roomId);
      const label = newRoom ? newRoom.name : "nessun ambiente (impianto di casa)";
      markDone("movedAsset");
      return {
        ...a,
        roomId: target.roomId,
        pos: target.pos,
        timeline: [{ date: "oggi", event: "Ambiente aggiornato", detail: `Spostato in: ${label}` }, ...a.timeline],
      };
    }));
  }

  function changeAssetRoom(assetId, newRoomId) {
    setAssets((prev) => prev.map((a) => {
      if (a.id !== assetId) return a;
      if (a.roomId === newRoomId) return a;
      const newRoom = rooms.find((r) => r.id === newRoomId);
      const label = newRoom ? newRoom.name : "nessun ambiente (impianto di casa)";
      return {
        ...a,
        roomId: newRoomId,
        pos: { x: 0.5, y: 0.5 },
        timeline: [{ date: "oggi", event: "Ambiente aggiornato", detail: `Spostato in: ${label}` }, ...a.timeline],
      };
    }));
    markDone("movedAsset");
  }

  function completeOnboarding(newHouse, newRooms, newAssets) {
    setHouse(newHouse);
    setRooms(newRooms);
    setAssets(newAssets);
    setInbox([]);
    setView("dashboard");
    markDone("houseCreated");
  }

  function loadDemo() {
    setHouse(DEMO_HOUSE);
    setRooms(initialRooms);
    setAssets(initialAssets);
    setInbox(inboxSeed);
    setView("dashboard");
    markDone("houseCreated");
  }

  if (!testStarted) {
    return <WelcomeScreen onStart={() => setTestStarted(true)} />;
  }

  if (!house) {
    return <Onboarding onComplete={completeOnboarding} onLoadDemo={loadDemo} />;
  }

  const selectedAsset = assets.find((a) => a.id === selectedAssetId);
  const selectedRoom = rooms.find((r) => r.id === selectedRoomId);

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: T.paper, fontFamily: "'Inter', sans-serif" }}>
      <style>{FONTS}</style>
      <Sidebar view={view} setView={setView} inboxCount={inbox.length} house={house} onEditHouse={() => setHouse(null)} onOpenFeedbackSummary={() => setFeedbackSummaryOpen(true)} />
      <div style={{ flex: 1, overflow: "auto" }}>
        {view === "dashboard" && <Dashboard house={house} rooms={rooms} assets={assets} inbox={inbox} setView={setView} openAsset={openAsset} />}
        {view === "inbox" && <InboxView inbox={inbox} setInbox={setInbox} assets={assets} setAssets={setAssets} onFieldsApplied={() => markDone("appliedDoc")} onCreateAssetForType={createAssetForType} />}
        {view === "floorplan" && <FloorPlanView house={house} rooms={rooms} assets={assets} openAsset={openAsset} onMoveAsset={moveAssetOnPlan} />}
        {view === "rooms" && <RoomsView house={house} rooms={rooms} assets={assets} openRoom={openRoom} />}
        {view === "room-detail" && selectedRoom && (
          <RoomDetail room={selectedRoom} assets={assets} back={() => setView("rooms")} openAsset={openAsset} onAddAsset={openAddAsset} />
        )}
        {view === "assets" && <AssetsView house={house} assets={assets} rooms={rooms} openAsset={openAsset} onAddAsset={openAddAsset} />}
        {view === "asset-detail" && selectedAsset && (
          <AssetDetail
            asset={selectedAsset}
            room={rooms.find((r) => r.id === selectedAsset.roomId)}
            rooms={rooms}
            back={() => setView("assets")}
            openRoom={openRoom}
            onChangeRoom={changeAssetRoom}
            onEdit={() => setEditAssetId(selectedAsset.id)}
            onUploadDoc={applyDocToAsset}
          />
        )}
        {view === "asset-detail" && !selectedAsset && (
          <div style={{ padding: 44, fontFamily: "'Inter', sans-serif", color: T.slate }}>
            Asset non trovato. <button onClick={() => setView("assets")} style={{ color: T.pine, background: "none", border: "none", cursor: "pointer" }}>Torna agli asset</button>
          </div>
        )}
      </div>
      {addAssetOpen && (
        <AddAssetModal
          rooms={rooms}
          defaultRoomId={addAssetRoomId}
          onCreate={createAsset}
          onClose={() => setAddAssetOpen(false)}
        />
      )}
      {editAssetId && (
        <EditAssetModal
          asset={assets.find((a) => a.id === editAssetId)}
          onSave={saveAssetEdits}
          onClose={() => setEditAssetId(null)}
        />
      )}

      <TaskChecklist
        progress={progress}
        onOpenFeedback={() => setFeedbackOpen(true)}
        minimized={checklistMinimized}
        setMinimized={setChecklistMinimized}
      />
      {feedbackOpen && (
        <FeedbackModal onClose={() => setFeedbackOpen(false)} onSubmitted={() => markDone("feedbackGiven")} />
      )}
      {feedbackSummaryOpen && (
        <FeedbackSummaryView onClose={() => setFeedbackSummaryOpen(false)} />
      )}
    </div>
  );
}
