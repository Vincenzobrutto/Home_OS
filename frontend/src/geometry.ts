// Due forme di planGeometry, entrambe in coordinate relative 0-1 rispetto
// al contenitore della planimetria:
//  - rect: gli ambienti creati/ridimensionati come box (comportamento
//    originale, anche quello proposto dall'estrazione AI di una planimetria)
//  - polygon: ambienti disegnati a mano punto per punto, forma libera
export interface Point {
  x: number;
  y: number;
}

export interface RectGeometry {
  kind: 'rect';
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface PolygonGeometry {
  kind: 'polygon';
  points: Point[];
}

export type RoomGeometry = RectGeometry | PolygonGeometry;

// Ruota di 90° in senso orario, attorno al centro (0.5, 0.5) dello spazio
// 0-1 — usato per "Ruota mappa" (vedi FloorPlan.tsx): ambienti e asset
// vengono ruotati per davvero (le coordinate salvate cambiano), non solo
// visivamente, così ogni asset resta nell'ambiente a cui è assegnato senza
// bisogno di ricalcolare quell'assegnazione. Lo sfondo caricato viene poi
// ruotato della stessa quantità (raster, via canvas) per restare allineato.
export function rotatePoint90(p: Point): Point {
  return { x: 1 - p.y, y: p.x };
}

export function rotateGeometry90(g: RoomGeometry): RoomGeometry {
  if (g.kind === 'rect') {
    return { kind: 'rect', x: 1 - g.y - g.height, y: g.x, width: g.height, height: g.width };
  }
  return { kind: 'polygon', points: g.points.map(rotatePoint90) };
}

// Dati salvati prima dell'introduzione dei poligoni non hanno "kind": erano
// sempre rettangoli.
export function normalizeGeometry(raw: unknown): RoomGeometry | null {
  if (!raw || typeof raw !== 'object') return null;
  const g = raw as Record<string, unknown>;
  if (g.kind === 'polygon' && Array.isArray(g.points)) {
    return { kind: 'polygon', points: g.points as Point[] };
  }
  if (typeof g.x === 'number' && typeof g.y === 'number' && typeof g.width === 'number' && typeof g.height === 'number') {
    return { kind: 'rect', x: g.x, y: g.y, width: g.width, height: g.height };
  }
  return null;
}

export function boundingBoxOf(g: RoomGeometry): RectGeometry {
  if (g.kind === 'rect') return g;
  const xs = g.points.map((p) => p.x);
  const ys = g.points.map((p) => p.y);
  const x = Math.min(...xs);
  const y = Math.min(...ys);
  return { kind: 'rect', x, y, width: Math.max(...xs) - x, height: Math.max(...ys) - y };
}

export function centroidOf(g: RoomGeometry): Point {
  if (g.kind === 'rect') return { x: g.x + g.width / 2, y: g.y + g.height / 2 };
  const n = g.points.length;
  return {
    x: g.points.reduce((s, p) => s + p.x, 0) / n,
    y: g.points.reduce((s, p) => s + p.y, 0) / n,
  };
}

export function translateGeometry(g: RoomGeometry, dx: number, dy: number): RoomGeometry {
  if (g.kind === 'rect') {
    return { ...g, x: clamp01(g.x + dx), y: clamp01(g.y + dy) };
  }
  // Trasla tutti i punti insieme; se qualcuno uscirebbe da [0,1] annulla lo
  // spostamento su quell'asse per l'intera forma, per non deformarla.
  const xs = g.points.map((p) => p.x + dx);
  const ys = g.points.map((p) => p.y + dy);
  const okX = Math.min(...xs) >= 0 && Math.max(...xs) <= 1;
  const okY = Math.min(...ys) >= 0 && Math.max(...ys) <= 1;
  return {
    kind: 'polygon',
    points: g.points.map((p) => ({ x: okX ? p.x + dx : p.x, y: okY ? p.y + dy : p.y })),
  };
}

export function clamp01(v: number): number {
  return Math.min(Math.max(v, 0), 1);
}

// Punto dove disegnare l'etichetta (nome ambiente) o il punto di partenza
// di un asset nella stanza — per un rettangolo o un poligono convesso il
// centroide (media dei vertici) è già dentro la forma, ma per un poligono
// concavo (es. una stanza a L o a U come un terrazzo che gira attorno ad
// altri ambienti) NON è garantito: può cadere fuori dalla stanza stessa.
// Se succede, cerca fra una griglia di punti interni quello più vicino al
// centroide "ideale" — non il centro visivo perfetto, ma sempre dentro.
export function labelPointOf(g: RoomGeometry): Point {
  const centroid = centroidOf(g);
  if (g.kind === 'rect' || pointInGeometry(g, centroid)) return centroid;

  const bbox = boundingBoxOf(g);
  const steps = 24;
  let best: Point | null = null;
  let bestDist = Infinity;
  for (let i = 0; i <= steps; i++) {
    for (let j = 0; j <= steps; j++) {
      const p = { x: bbox.x + (bbox.width * i) / steps, y: bbox.y + (bbox.height * j) / steps };
      if (!pointInGeometry(g, p)) continue;
      const d = Math.hypot(p.x - centroid.x, p.y - centroid.y);
      if (d < bestDist) {
        bestDist = d;
        best = p;
      }
    }
  }
  return best ?? centroid;
}

// Usato per capire in quale ambiente ricade un'icona asset trascinata sulla
// planimetria (vedi FloorPlan.tsx) — rect è un controllo diretto sui bordi,
// polygon usa ray-casting (attraversamenti dispari = punto dentro).
export function pointInGeometry(g: RoomGeometry, p: Point): boolean {
  if (g.kind === 'rect') {
    return p.x >= g.x && p.x <= g.x + g.width && p.y >= g.y && p.y <= g.y + g.height;
  }
  let inside = false;
  const pts = g.points;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const xi = pts[i].x;
    const yi = pts[i].y;
    const xj = pts[j].x;
    const yj = pts[j].y;
    const intersect = yi > p.y !== yj > p.y && p.x < ((xj - xi) * (p.y - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}
