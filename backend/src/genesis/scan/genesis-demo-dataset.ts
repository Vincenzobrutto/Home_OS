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
  { proposedName: 'Camera 2', roomType: 'CAMERA', confidence: 0.86 },
  { proposedName: 'Studio', roomType: 'CAMERA', confidence: 0.82 },
  { proposedName: 'Bagno 2', roomType: 'BAGNO', confidence: 0.83 },
  { proposedName: 'Lavanderia', roomType: 'BAGNO', confidence: 0.8 },
  { proposedName: 'Ingresso', roomType: 'SOGGIORNO', confidence: 0.78 },
  { proposedName: 'Corridoio', roomType: 'SOGGIORNO', confidence: 0.76 },
  { proposedName: 'Ripostiglio', roomType: 'CUCINA', confidence: 0.77 },
  { proposedName: 'Garage', roomType: 'SOGGIORNO', confidence: 0.79 },
  { proposedName: 'Cantina', roomType: 'SOGGIORNO', confidence: 0.74 },
  { proposedName: 'Terrazzo', roomType: 'SOGGIORNO', confidence: 0.75 },
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
  {
    proposedName: 'Piano cottura',
    assetType: 'ELETTRODOMESTICO',
    roomName: 'Cucina',
    confidence: 0.86,
  },
  {
    proposedName: 'Cappa aspirante',
    assetType: 'ELETTRODOMESTICO',
    roomName: 'Cucina',
    confidence: 0.79,
  },
  {
    proposedName: 'Microonde',
    assetType: 'ELETTRODOMESTICO',
    roomName: 'Cucina',
    confidence: 0.81,
  },
  {
    proposedName: 'Lavatrice',
    assetType: 'ELETTRODOMESTICO',
    roomName: 'Lavanderia',
    confidence: 0.88,
  },
  {
    proposedName: 'Asciugatrice',
    assetType: 'ELETTRODOMESTICO',
    roomName: 'Lavanderia',
    confidence: 0.82,
  },
  {
    proposedName: 'Climatizzatore camera',
    assetType: 'CLIMA',
    roomName: 'Camera da letto',
    confidence: 0.84,
  },
  {
    proposedName: 'Climatizzatore camera 2',
    assetType: 'CLIMA',
    roomName: 'Camera 2',
    confidence: 0.81,
  },
  {
    proposedName: 'Climatizzatore studio',
    assetType: 'CLIMA',
    roomName: 'Studio',
    confidence: 0.8,
  },
  {
    proposedName: 'Televisore soggiorno',
    assetType: 'ELETTRODOMESTICO',
    roomName: 'Soggiorno',
    confidence: 0.77,
  },
  {
    proposedName: 'Televisore camera',
    assetType: 'ELETTRODOMESTICO',
    roomName: 'Camera da letto',
    confidence: 0.73,
  },
  {
    proposedName: 'Pompa di calore',
    assetType: 'CLIMA',
    roomName: null,
    confidence: 0.76,
  },
  {
    proposedName: 'Caldaia',
    assetType: 'CALDAIA',
    roomName: null,
    confidence: 0.82,
  },
  {
    proposedName: 'Addolcitore acqua',
    assetType: 'IDRAULICO',
    roomName: null,
    confidence: 0.7,
  },
  {
    proposedName: 'Impianto idraulico',
    assetType: 'IDRAULICO',
    roomName: null,
    confidence: 0.72,
  },
  {
    proposedName: 'Wallbox auto',
    assetType: 'ELETTRICO',
    roomName: 'Garage',
    confidence: 0.75,
  },
  {
    proposedName: 'Basculante garage',
    assetType: 'ELETTRODOMESTICO',
    roomName: 'Garage',
    confidence: 0.68,
  },
  {
    proposedName: 'Congelatore',
    assetType: 'ELETTRODOMESTICO',
    roomName: 'Cantina',
    confidence: 0.74,
  },
  {
    proposedName: 'Tenda da sole',
    assetType: 'ELETTRODOMESTICO',
    roomName: 'Terrazzo',
    confidence: 0.67,
  },
];
