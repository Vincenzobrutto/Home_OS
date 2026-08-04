// Dataset demo centralizzato per la scansione guidata mock — un solo posto
// da cui il provider legge, non duplicato in più componenti (vedi spec
// Genesis §13). Confidence e valori sono FISSI, non casuali: la scansione
// deve produrre lo stesso risultato ad ogni esecuzione (deterministico),
// non un output diverso ogni volta — più facile da testare e da spiegare
// all'utente ("perché questo elemento ha l'80% di confidenza").
//
// Le stanze usano `roomType` allineato 1:1 ai valori dell'enum Prisma
// RoomType; gli asset usano `assetType` allineato ad AssetType. `roomName`
// su un asset lega l'osservazione ASSET alla ROOM osservata nello stesso
// giro (matching per nome al momento della conferma, vedi genesis.service.ts)
// — roomName assente = impianto di casa, stessa semantica di roomId null su
// un Asset reale.
export interface DemoRoomObservation {
  proposedName: string;
  roomType: string;
  confidence: number;
}

export interface DemoAssetObservation {
  proposedName: string;
  assetType: string;
  roomName: string | null;
  confidence: number;
}

export const GENESIS_DEMO_ROOMS: DemoRoomObservation[] = [
  { proposedName: 'Cucina', roomType: 'CUCINA', confidence: 0.93 },
  { proposedName: 'Soggiorno', roomType: 'SOGGIORNO', confidence: 0.91 },
  { proposedName: 'Camera da letto', roomType: 'CAMERA', confidence: 0.88 },
  { proposedName: 'Bagno', roomType: 'BAGNO', confidence: 0.85 },
];

export const GENESIS_DEMO_ASSETS: DemoAssetObservation[] = [
  {
    proposedName: 'Frigorifero',
    assetType: 'ELETTRODOMESTICO',
    roomName: 'Cucina',
    confidence: 0.89,
  },
  {
    proposedName: 'Forno',
    assetType: 'ELETTRODOMESTICO',
    roomName: 'Cucina',
    confidence: 0.84,
  },
  {
    proposedName: 'Lavastoviglie',
    assetType: 'ELETTRODOMESTICO',
    roomName: 'Cucina',
    confidence: 0.8,
  },
  {
    proposedName: 'Climatizzatore',
    assetType: 'CLIMA',
    roomName: 'Soggiorno',
    confidence: 0.86,
  },
  {
    proposedName: 'Scaldabagno',
    assetType: 'CALDAIA',
    roomName: 'Bagno',
    confidence: 0.78,
  },
  {
    // Impianto di casa, deliberatamente senza stanza — stessa semantica di
    // roomId null su un Asset reale, non un dato mancante.
    proposedName: 'Impianto elettrico',
    assetType: 'ELETTRICO',
    roomName: null,
    confidence: 0.72,
  },
  {
    proposedName: 'Impianto fotovoltaico',
    assetType: 'FOTOVOLTAICO',
    roomName: null,
    confidence: 0.7,
  },
];
