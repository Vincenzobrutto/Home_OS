// Stessi design token del prototipo React (prototipo/homeos_prototype.jsx),
// riusati 1:1 per restare fedeli alla UI già validata con utenti reali.
import {
  Flame,
  Zap,
  Droplets,
  Sun,
  Wind,
  ChefHat,
  Refrigerator,
  Square,
  Layers,
  Armchair,
  BedDouble,
  Bath,
  Coffee,
  Microwave,
  CookingPot,
  WashingMachine,
  type LucideIcon,
} from 'lucide-react';

// Palette "Smeraldo" (2026-08-24, vedi decisions.md): stessa struttura e
// stessi ruoli di sempre (un solo accento acceso per le azioni primarie,
// rosso/arancio riservati agli stati "da controllare", il resto neutro),
// ma toni più saturi e sfondo più chiaro — l'obiettivo era più energia
// visiva senza perdere il riconoscimento già costruito con la palette
// precedente (verde muto su beige).
export const T = {
  paper: '#F5F6EF',
  paperDeep: '#E8EADF',
  ink: '#141A16',
  ink70: '#141A16B3',
  pine: '#0E8A5F',
  pineDeep: '#0A5A3D',
  ochre: '#F2A93B',
  ochreDeep: '#9C6412',
  rust: '#E4572E',
  line: '#DCDED2',
  card: '#FFFFFF',
  slate: '#5C6B62',
};

export const FONTS = `
@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Inter:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap');
`;

// Tutto lo stile dell'app è inline (niente file CSS/classi, vedi resto del
// progetto) — le media query però non si possono esprimere con style inline,
// quindi questo è l'unico blocco che usa classi CSS vere, iniettato una
// volta in App.tsx. `!important` qui è deliberato: deve vincere sugli stessi
// stili inline che le pagine già impostano per il desktop, non li duplica.
export const MOBILE_CSS = `
/* Spinner generico (es. scansione Genesis in corso) — un'unica keyframe
   condivisa invece di ripeterla per ogni componente che ne ha bisogno. */
@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
.spin {
  animation: spin 0.8s linear infinite;
}
/* Rete di sicurezza contro lo scroll orizzontale: un singolo elemento più
   largo del previsto (una tabella, una card non ancora resa responsive)
   altrimenti farebbe scorrere l'intera pagina di lato invece di essere
   semplicemente tagliato — molto più comune su schermi stretti. */
html, body {
  overflow-x: hidden;
  max-width: 100vw;
}
.app-topbar {
  display: none;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border-bottom: 1px solid ${T.line};
  background: ${T.card};
  position: sticky;
  top: 0;
  z-index: 30;
}
.app-menu-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  flex-shrink: 0;
  border-radius: 8px;
  border: 1px solid ${T.line};
  background: ${T.card};
  cursor: pointer;
  color: ${T.ink};
  padding: 0;
}
.app-topbar-title {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 12px;
  color: ${T.slate};
  letter-spacing: 0.04em;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.app-sidebar-backdrop {
  display: none;
}
/* Il pulsante per chiudere il pannello sta dentro la sidebar stessa e ha
   senso solo quando la sidebar è un pannello a scomparsa (sotto soglia) —
   su desktop la sidebar è già sempre visibile, non serve chiuderla. */
.app-sidebar-close {
  display: none;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  flex-shrink: 0;
  border-radius: 7px;
  cursor: pointer;
}

@media (max-width: 860px) {
  .app-topbar {
    display: flex;
  }
  .app-sidebar {
    position: fixed;
    inset: 0 auto 0 0;
    z-index: 50;
    transform: translateX(-100%);
    transition: transform 0.2s ease;
    box-shadow: 2px 0 20px rgba(0,0,0,0.3);
  }
  .app-sidebar.open {
    transform: translateX(0);
  }
  .app-sidebar-close {
    display: flex;
  }
  .app-sidebar-backdrop.open {
    display: block;
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.4);
    z-index: 40;
  }
  /* Tutte le pagine condividono lo stesso padding fisso da desktop (36px
     44px) sul loro div radice, diretto figlio di .app-content — ridotto
     qui invece che in ognuna delle ~12 viste. :not(.app-topbar) esclude la
     barra mobile stessa, altro figlio diretto con un padding suo proprio. */
  .app-content > div:not(.app-topbar) {
    padding: 18px 16px !important;
  }
  .grid-responsive {
    grid-template-columns: 1fr !important;
  }
  /* Le tessere statistiche della Dashboard sono piccole (icona + numero) —
     1 sola colonna le farebbe sembrare sproporzionatamente larghe, 2x2 sta
     meglio della griglia a 4 che altrimenti trabocca sotto ~430px. */
  .grid-responsive-2 {
    grid-template-columns: 1fr 1fr !important;
  }
  .property-profile-grid {
    grid-template-columns: 1fr !important;
  }
  .property-proposal-row {
    grid-template-columns: 22px 1fr !important;
  }
  .property-proposal-row > input:not([type='checkbox']) {
    grid-column: 2;
  }
}
`;

interface TypeMeta {
  label: string;
  icon: LucideIcon;
  color: string;
}

// Chiavi = valori degli enum Prisma (RoomType/AssetType), così non serve
// nessuna traduzione tra frontend e backend.
export const ROOM_TYPES: Record<string, TypeMeta> = {
  CUCINA: { label: 'Cucina', icon: ChefHat, color: T.slate },
  SOGGIORNO: { label: 'Soggiorno', icon: Armchair, color: T.pine },
  CAMERA: { label: 'Camera da letto', icon: BedDouble, color: T.ochreDeep },
  BAGNO: { label: 'Bagno', icon: Bath, color: T.rust },
};

export const ASSET_TYPES: Record<string, TypeMeta> = {
  CALDAIA: { label: 'Caldaia', icon: Flame, color: T.rust },
  ELETTRICO: { label: 'Impianto elettrico', icon: Zap, color: T.ochreDeep },
  IDRAULICO: { label: 'Impianto idraulico', icon: Droplets, color: T.pine },
  FOTOVOLTAICO: { label: 'Fotovoltaico', icon: Sun, color: T.ochre },
  CLIMA: { label: 'Climatizzazione', icon: Wind, color: T.pine },
  TETTO: { label: 'Tetto', icon: Layers, color: T.ochreDeep },
  FINESTRE: { label: 'Finestre', icon: Square, color: T.slate },
  ELETTRODOMESTICO: {
    label: 'Elettrodomestico',
    icon: Refrigerator,
    color: T.slate,
  },
};

// "Elettrodomestico" da solo raggruppa oggetti molto diversi (frigo, forno,
// lavatrice, macchina del caffè...) — l'icona di categoria da sola non li
// distingue. Qui si affina in base a parole chiave nel nome specifico
// dell'asset (stesso approccio a euristiche per parole chiave già usato
// nell'estrazione documenti sul backend), senza bisogno di un sotto-tipo
// nello schema. Nessun match: resta l'icona di categoria.
const APPLIANCE_ICON_HINTS: [string[], LucideIcon][] = [
  [['caffè', 'caffe'], Coffee],
  [['microonde'], Microwave],
  [['forno'], Microwave],
  [['induzione', 'cottura', 'fornelli', 'piano cottura'], CookingPot],
  [['lavatrice', 'lavastoviglie', 'asciugatrice'], WashingMachine],
];

export function iconForAsset(asset: { type: string; name: string }): LucideIcon {
  const meta = ASSET_TYPES[asset.type];
  if (asset.type !== 'ELETTRODOMESTICO') return meta.icon;
  const lower = asset.name.toLowerCase();
  const hint = APPLIANCE_ICON_HINTS.find(([keywords]) => keywords.some((k) => lower.includes(k)));
  return hint ? hint[1] : meta.icon;
}
