import { useEffect, useRef, useState } from 'react';
import { Pencil, Plus, RotateCw, Upload, X } from 'lucide-react';
import { T, ROOM_TYPES, ASSET_TYPES, iconForAsset } from '../theme';
import { SectionLabel } from './Shared';
import { api } from '../api';
import { renderPdfFirstPageToDataUrl } from '../pdfRender';
import {
  boundingBoxOf,
  clamp01,
  labelPointOf,
  normalizeGeometry,
  pointInGeometry,
  rotateGeometry90,
  rotatePoint90,
  translateGeometry,
  type Point,
  type RectGeometry,
  type RoomGeometry,
} from '../geometry';
import type { Asset, House, Room } from '../types';

// Posizione di default (prima che l'utente la trascini almeno una volta):
// il centro dell'ambiente, con un piccolo scarto deterministico per asset
// così più icone nello stesso ambiente non si sovrappongono perfettamente.
// Deterministico sull'id (non random) perché non deve "saltare" a ogni
// render finché non viene davvero spostata.
function jitterFor(assetId: string): Point {
  let h = 0;
  for (let i = 0; i < assetId.length; i++) h = (h * 31 + assetId.charCodeAt(i)) >>> 0;
  const angle = (h % 360) * (Math.PI / 180);
  const radius = 0.02 + ((h >> 8) % 100 / 100) * 0.03;
  return { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius };
}

interface AssetDragInfo {
  assetId: string;
  startClientX: number;
  startClientY: number;
  startPoint: Point;
  containerWidth: number;
  containerHeight: number;
}

const MIN_SIZE = 0.06;
const DEFAULT_GEOMETRY: RectGeometry = { kind: 'rect', x: 0.1, y: 0.1, width: 0.22, height: 0.22 };
const CLOSE_POINT_PIXEL_RADIUS = 14;
const DEFAULT_ASPECT_RATIO = 4 / 3;

// Cache a livello di modulo (non di componente): sopravvive ai doppi mount
// di React.StrictMode in sviluppo e a un cambio di scheda avanti/indietro,
// così il PDF viene scaricato e renderizzato una sola volta per documento.
const backgroundCache = new Map<string, Promise<string | null>>();

async function loadFloorPlanBackground(houseId: string): Promise<string | null> {
  if (!backgroundCache.has(houseId)) {
    backgroundCache.set(
      houseId,
      (async () => {
        const docs = await api.documents.listForHouse(houseId);
        const floorPlanDocs = docs
          .filter((d) => d.docType === 'Planimetria' && d.status === 'CONFIRMED')
          .sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());
        const latest = floorPlanDocs[0];
        if (!latest) return null;

        const res = await fetch(api.documents.fileUrl(latest.id));
        if (!res.ok) throw new Error('Impossibile caricare il file della planimetria');
        const contentType = res.headers.get('content-type') ?? '';
        const buffer = await res.arrayBuffer();

        const isPdf = contentType.includes('pdf') || latest.originalFilename.toLowerCase().endsWith('.pdf');
        return isPdf
          ? await renderPdfFirstPageToDataUrl(buffer)
          : URL.createObjectURL(new Blob([buffer], { type: contentType }));
      })(),
    );
  }
  return backgroundCache.get(houseId)!;
}

function invalidateFloorPlanBackground(houseId: string) {
  backgroundCache.delete(houseId);
}

// "Ruota mappa" ruota per davvero le coordinate di ambienti/asset salvate
// (vedi rotateGeometry90/rotatePoint90 in geometry.ts), non solo la vista —
// altrimenti l'immagine di sfondo originale (mai modificata sul server)
// resterebbe disallineata ai contorni degli ambienti già ruotati. Qui la si
// riruota via canvas, della stessa quantità (house.floorPlanRotation),
// prima di mostrarla.
function rotateImageDataUrl(sourceUrl: string, degrees: number): Promise<string> {
  if (degrees === 0) return Promise.resolve(sourceUrl);
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const swapped = degrees === 90 || degrees === 270;
      const canvas = document.createElement('canvas');
      canvas.width = swapped ? img.naturalHeight : img.naturalWidth;
      canvas.height = swapped ? img.naturalWidth : img.naturalHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas non disponibile per ruotare la planimetria'));
        return;
      }
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate((degrees * Math.PI) / 180);
      ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);
      resolve(canvas.toDataURL());
    };
    img.onerror = () => reject(new Error('Impossibile caricare la planimetria da ruotare'));
    img.src = sourceUrl;
  });
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

interface DragInfo {
  roomId: string;
  mode: 'move' | 'resize' | 'vertex';
  pointIndex?: number;
  startClientX: number;
  startClientY: number;
  startGeometry: RoomGeometry;
  containerWidth: number;
  containerHeight: number;
}

function computeGeometry(drag: DragInfo, clientX: number, clientY: number): RoomGeometry {
  const dx = (clientX - drag.startClientX) / drag.containerWidth;
  const dy = (clientY - drag.startClientY) / drag.containerHeight;
  const g = drag.startGeometry;

  if (drag.mode === 'move') {
    return translateGeometry(g, dx, dy);
  }
  if (drag.mode === 'resize' && g.kind === 'rect') {
    return {
      ...g,
      width: clamp(g.width + dx, MIN_SIZE, 1 - g.x),
      height: clamp(g.height + dy, MIN_SIZE, 1 - g.y),
    };
  }
  if (drag.mode === 'vertex' && g.kind === 'polygon' && drag.pointIndex !== undefined) {
    const points = g.points.map((p, i) =>
      i === drag.pointIndex ? { x: clamp01(p.x + dx), y: clamp01(p.y + dy) } : p,
    );
    return { kind: 'polygon', points };
  }
  return g;
}

export function FloorPlanView({
  house,
  rooms,
  assets,
  onRoomsChanged,
  onAssetsChanged,
  onHouseChanged,
  hideHeader,
}: {
  house: House;
  rooms: Room[];
  assets: Asset[];
  // Promise<void>, non void: "Ruota" li aspetta prima di riabilitare il
  // pulsante (vedi rotateView) — senza aspettare, un doppio click potrebbe
  // partire da dati ancora vecchi (rooms/assets non ancora aggiornati dal
  // giro precedente) e corrompere le coordinate.
  onRoomsChanged: () => Promise<void>;
  onAssetsChanged: () => Promise<void>;
  onHouseChanged: (house: House) => void;
  hideHeader?: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragInfo | null>(null);
  const [liveGeometry, setLiveGeometry] = useState<Record<string, RoomGeometry>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const assetDragRef = useRef<AssetDragInfo | null>(null);
  const [liveAssetPositions, setLiveAssetPositions] = useState<Record<string, Point>>({});
  const [savingAssetId, setSavingAssetId] = useState<string | null>(null);
  const [hoveredAssetId, setHoveredAssetId] = useState<string | null>(null);
  const [pendingGeometry, setPendingGeometry] = useState<RoomGeometry | null>(null);
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState('CUCINA');
  const [drawingPoints, setDrawingPoints] = useState<Point[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [backgroundUrl, setBackgroundUrl] = useState<string | null>(null);
  const [backgroundAspectRatio, setBackgroundAspectRatio] = useState<number | null>(null);
  const [backgroundLoading, setBackgroundLoading] = useState(false);
  const [showBackground, setShowBackground] = useState(true);
  const [backgroundOpacity, setBackgroundOpacity] = useState(0.4);
  const [backgroundVersion, setBackgroundVersion] = useState(0);
  const [uploadingBackground, setUploadingBackground] = useState(false);
  const backgroundFileInputRef = useRef<HTMLInputElement>(null);
  const [rotating, setRotating] = useState(false);

  const placedRooms = rooms
    .map((r) => ({ room: r, geometry: normalizeGeometry(r.planGeometry) }))
    .filter((x): x is { room: Room; geometry: RoomGeometry } => x.geometry !== null);
  const placedIds = new Set(placedRooms.map((x) => x.room.id));
  const unplaced = rooms.filter((r) => !placedIds.has(r.id));

  // Ritaglia la vista sulla sola area occupata dagli ambienti (con un
  // margine), invece di mostrare l'intera pagina caricata — planimetrie
  // catastali hanno tabelle, intestazioni e distacchi attorno al disegno
  // vero e proprio che non interessano qui. Basato sulle geometrie salvate
  // (non su liveGeometry) così il ritaglio non "salta" mentre si trascina
  // un ambiente. Calcolato dal bounding box, non da un singolo ambiente.
  const MIN_CROP_SIZE = 0.05;
  const crop = (() => {
    if (placedRooms.length === 0) return { x: 0, y: 0, width: 1, height: 1 };
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const { geometry: g } of placedRooms) {
      const b = boundingBoxOf(g);
      minX = Math.min(minX, b.x);
      minY = Math.min(minY, b.y);
      maxX = Math.max(maxX, b.x + b.width);
      maxY = Math.max(maxY, b.y + b.height);
    }
    const padX = Math.max((maxX - minX) * 0.14, MIN_CROP_SIZE / 2);
    const padY = Math.max((maxY - minY) * 0.14, MIN_CROP_SIZE / 2);
    const x = clamp01(minX - padX);
    const y = clamp01(minY - padY);
    const width = Math.max(Math.min(1 - x, maxX - minX + 2 * padX), MIN_CROP_SIZE);
    const height = Math.max(Math.min(1 - y, maxY - minY + 2 * padY), MIN_CROP_SIZE);
    return { x, y, width, height };
  })();

  // Solo gli asset il cui ambiente è già posizionato sulla mappa possono
  // avere un'icona: un asset senza ambiente (impianti di casa, vedi
  // Documenti casa) o il cui ambiente non è ancora sulla planimetria non ha
  // un punto di partenza sensato.
  const placedAssets = assets
    .filter((a) => !a.dismissedAt && a.roomId && placedIds.has(a.roomId))
    .map((a) => {
      const room = placedRooms.find((x) => x.room.id === a.roomId)!.room;
      const explicit = a.planPosX != null && a.planPosY != null ? { x: Number(a.planPosX), y: Number(a.planPosY) } : null;
      const c = labelPointOf(geometryOf(room));
      const j = jitterFor(a.id);
      const fallback = { x: clamp01(c.x + j.x), y: clamp01(c.y + j.y) };
      return { asset: a, point: liveAssetPositions[a.id] ?? explicit ?? fallback };
    });

  function roomAt(point: Point): Room | null {
    for (const { room } of placedRooms) {
      if (pointInGeometry(geometryOf(room), point)) return room;
    }
    return null;
  }

  // Pointer Events invece di mouse-only: unificano mouse/touch/penna nella
  // stessa API (stessi clientX/clientY), così il trascinamento funziona
  // anche da cellulare senza logica separata — vedi anche touchAction:
  // 'none' sugli elementi trascinabili, che impedisce al browser di
  // interpretare il gesto come uno scroll della pagina.
  function startAssetDrag(e: React.PointerEvent, asset: Asset, point: Point) {
    if (drawingPoints !== null) return;
    e.preventDefault();
    e.stopPropagation();
    const rect = containerRef.current!.getBoundingClientRect();
    assetDragRef.current = {
      assetId: asset.id,
      startClientX: e.clientX,
      startClientY: e.clientY,
      startPoint: point,
      containerWidth: rect.width,
      containerHeight: rect.height,
    };
    window.addEventListener('pointermove', onAssetMouseMove);
    window.addEventListener('pointerup', onAssetMouseUp);
  }

  function onAssetMouseMove(e: PointerEvent) {
    const drag = assetDragRef.current;
    if (!drag) return;
    const dx = (e.clientX - drag.startClientX) / drag.containerWidth;
    const dy = (e.clientY - drag.startClientY) / drag.containerHeight;
    setLiveAssetPositions((prev) => ({
      ...prev,
      [drag.assetId]: { x: clamp01(drag.startPoint.x + dx), y: clamp01(drag.startPoint.y + dy) },
    }));
  }

  async function onAssetMouseUp(e: PointerEvent) {
    window.removeEventListener('pointermove', onAssetMouseMove);
    window.removeEventListener('pointerup', onAssetMouseUp);
    const drag = assetDragRef.current;
    assetDragRef.current = null;
    if (!drag) return;

    const dx = (e.clientX - drag.startClientX) / drag.containerWidth;
    const dy = (e.clientY - drag.startClientY) / drag.containerHeight;
    const finalPoint = { x: clamp01(drag.startPoint.x + dx), y: clamp01(drag.startPoint.y + dy) };
    const hitRoom = roomAt(finalPoint);

    // Rilasciata fuori da ogni ambiente: senza sapere a quale stanza
    // assegnarla, annulla lo spostamento invece di lasciarla "nel nulla" o
    // di cambiarle ambiente a caso.
    if (!hitRoom) {
      setLiveAssetPositions((prev) => {
        const { [drag.assetId]: _removed, ...rest } = prev;
        return rest;
      });
      return;
    }

    const asset = assets.find((a) => a.id === drag.assetId);
    setSavingAssetId(drag.assetId);
    setError(null);
    try {
      await api.assets.update(drag.assetId, {
        planPosX: finalPoint.x,
        planPosY: finalPoint.y,
        ...(asset && asset.roomId !== hitRoom.id ? { roomId: hitRoom.id } : {}),
      });
      onAssetsChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore imprevisto');
    } finally {
      setSavingAssetId(null);
      setLiveAssetPositions((prev) => {
        const { [drag.assetId]: _removed, ...rest } = prev;
        return rest;
      });
    }
  }

  // Mostra in trasparenza l'ultima planimetria caricata e confermata, così
  // le posizioni stimate dall'AI si possono correggere a vista invece che
  // alla cieca. loadFloorPlanBackground è memoizzata per casa: anche col
  // doppio mount di React.StrictMode in sviluppo scarica/renderizza una
  // sola volta.
  useEffect(() => {
    let cancelled = false;
    setBackgroundLoading(true);
    setBackgroundUrl(null);
    loadFloorPlanBackground(house.id)
      .then((url) => (url ? rotateImageDataUrl(url, house.floorPlanRotation) : null))
      .then((url) => {
        if (!cancelled) setBackgroundUrl(url);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Errore imprevisto');
      })
      .finally(() => {
        if (!cancelled) setBackgroundLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [house.id, backgroundVersion, house.floorPlanRotation]);

  // Il contenitore deve avere le stesse proporzioni dell'immagine di sfondo
  // (o della pagina PDF renderizzata) perché le geometrie 0-1 delle stanze
  // sono relative alle sue dimensioni: se il contenitore avesse un aspect
  // ratio diverso, sia lo sfondo che i box delle stanze finirebbero deformati
  // o disallineati tra loro. backgroundUrl è già un'immagine caricabile dal
  // browser (data URL per i PDF renderizzati, object URL per gli altri file),
  // quindi basta leggerne le dimensioni naturali una volta caricata.
  useEffect(() => {
    if (!backgroundUrl) {
      setBackgroundAspectRatio(null);
      return;
    }
    let cancelled = false;
    const img = new Image();
    img.onload = () => {
      if (!cancelled && img.naturalWidth > 0 && img.naturalHeight > 0) {
        setBackgroundAspectRatio(img.naturalWidth / img.naturalHeight);
      }
    };
    img.src = backgroundUrl;
    return () => {
      cancelled = true;
    };
  }, [backgroundUrl]);

  async function handleBackgroundFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setUploadingBackground(true);
    setError(null);
    try {
      await api.documents.uploadFloorPlanBackground(house.id, file);
      invalidateFloorPlanBackground(house.id);
      setBackgroundVersion((v) => v + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore imprevisto');
    } finally {
      setUploadingBackground(false);
    }
  }

  async function deleteRoom(room: Room) {
    if (!window.confirm(`Eliminare l'ambiente "${room.name}"? Gli eventuali asset collegati resteranno, ma senza ambiente assegnato.`)) {
      return;
    }
    setSavingId(room.id);
    setError(null);
    try {
      await api.rooms.remove(room.id);
      onRoomsChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore imprevisto');
    } finally {
      setSavingId(null);
    }
  }

  function geometryOf(room: Room): RoomGeometry {
    return liveGeometry[room.id] ?? normalizeGeometry(room.planGeometry) ?? DEFAULT_GEOMETRY;
  }

  function startDrag(e: React.PointerEvent, room: Room, mode: DragInfo['mode'], pointIndex?: number) {
    if (drawingPoints !== null) return; // in modalità disegno le forme esistenti non si toccano
    e.preventDefault();
    e.stopPropagation();
    const rect = containerRef.current!.getBoundingClientRect();
    dragRef.current = {
      roomId: room.id,
      mode,
      pointIndex,
      startClientX: e.clientX,
      startClientY: e.clientY,
      startGeometry: geometryOf(room),
      containerWidth: rect.width,
      containerHeight: rect.height,
    };
    window.addEventListener('pointermove', onMouseMove);
    window.addEventListener('pointerup', onMouseUp);
  }

  function onMouseMove(e: PointerEvent) {
    const drag = dragRef.current;
    if (!drag) return;
    const next = computeGeometry(drag, e.clientX, e.clientY);
    setLiveGeometry((prev) => ({ ...prev, [drag.roomId]: next }));
  }

  async function onMouseUp(e: PointerEvent) {
    window.removeEventListener('pointermove', onMouseMove);
    window.removeEventListener('pointerup', onMouseUp);
    const drag = dragRef.current;
    dragRef.current = null;
    if (!drag) return;

    const finalGeometry = computeGeometry(drag, e.clientX, e.clientY);
    setSavingId(drag.roomId);
    try {
      await api.rooms.update(drag.roomId, { planGeometry: finalGeometry });
      onRoomsChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore imprevisto');
    } finally {
      setSavingId(null);
      setLiveGeometry((prev) => {
        const { [drag.roomId]: _removed, ...rest } = prev;
        return rest;
      });
    }
  }

  // Ruota per davvero le coordinate salvate di tutti gli ambienti piazzati e
  // di tutti gli asset con una posizione esplicita (90° orario, attorno al
  // centro) — non una rotazione solo visiva: così ogni asset resta
  // nell'ambiente a cui è già assegnato, senza bisogno di ricalcolare quella
  // assegnazione. Lo sfondo viene poi riallineato ruotando l'immagine stessa
  // (vedi rotateImageDataUrl), non i contorni.
  async function rotateView() {
    setRotating(true);
    setError(null);
    try {
      const newRotation = (house.floorPlanRotation + 90) % 360;
      await Promise.all([
        ...placedRooms.map(({ room, geometry }) =>
          api.rooms.update(room.id, { planGeometry: rotateGeometry90(geometry) }),
        ),
        ...assets
          .filter((a) => a.planPosX != null && a.planPosY != null)
          .map((a) => {
            const rotated = rotatePoint90({ x: Number(a.planPosX), y: Number(a.planPosY) });
            return api.assets.update(a.id, { planPosX: rotated.x, planPosY: rotated.y });
          }),
        api.houses.update(house.id, { floorPlanRotation: newRotation }),
      ]);
      // Aspetta che rooms/assets siano ricaricati (non solo lanciati) prima
      // di uscire dal try — vedi il commento sul tipo delle prop sopra.
      await Promise.all([onRoomsChanged(), onAssetsChanged()]);
      onHouseChanged({ ...house, floorPlanRotation: newRotation });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore imprevisto');
    } finally {
      setRotating(false);
    }
  }

  // Posiziona un ambiente nuovo/non ancora piazzato dentro l'area attualmente
  // ritagliata (vedi "crop" sopra), non a una coordinata fissa della pagina
  // — altrimenti comparirebbe fuori dalla vista finché il ritaglio non si
  // allarga per includerlo, ed è invisibile finché l'utente non lo scopre.
  function defaultRoomGeometry(offsetIndex: number): RectGeometry {
    const size = clamp(Math.min(crop.width, crop.height) * 0.35, MIN_SIZE, 1);
    const offset = crop.width * 0.04 * offsetIndex;
    return {
      kind: 'rect',
      x: clamp(crop.x + crop.width * 0.1 + offset, 0, 1 - size),
      y: clamp(crop.y + crop.height * 0.1 + offset, 0, 1 - size),
      width: size,
      height: size,
    };
  }

  async function placeExisting(room: Room) {
    setSavingId(room.id);
    setError(null);
    try {
      await api.rooms.update(room.id, {
        planGeometry: defaultRoomGeometry(placedRooms.length),
      });
      onRoomsChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore imprevisto');
    } finally {
      setSavingId(null);
    }
  }

  function startNewRect() {
    setDrawingPoints(null);
    setPendingGeometry(defaultRoomGeometry(rooms.length));
  }

  function startDrawing() {
    setPendingGeometry(null);
    setDrawingPoints([]);
  }

  function cancelDrawing() {
    setDrawingPoints(null);
  }

  function relativePointFromEvent(e: React.MouseEvent): Point {
    const rect = containerRef.current!.getBoundingClientRect();
    return {
      x: clamp01((e.clientX - rect.left) / rect.width),
      y: clamp01((e.clientY - rect.top) / rect.height),
    };
  }

  function handleContainerClick(e: React.MouseEvent) {
    if (drawingPoints === null) return;
    const rect = containerRef.current!.getBoundingClientRect();
    const point = relativePointFromEvent(e);

    if (drawingPoints.length >= 3) {
      const first = drawingPoints[0];
      const pixelDist = Math.hypot(
        (point.x - first.x) * rect.width,
        (point.y - first.y) * rect.height,
      );
      if (pixelDist <= CLOSE_POINT_PIXEL_RADIUS) {
        finishDrawing();
        return;
      }
    }
    setDrawingPoints((prev) => [...(prev ?? []), point]);
  }

  function finishDrawing() {
    if (!drawingPoints || drawingPoints.length < 3) return;
    setPendingGeometry({ kind: 'polygon', points: drawingPoints });
    setDrawingPoints(null);
  }

  async function submitPendingRoom() {
    if (!newName.trim() || !pendingGeometry) return;
    setError(null);
    try {
      await api.rooms.create(house.id, {
        type: newType,
        name: newName.trim(),
        planGeometry: pendingGeometry,
      });
      setNewName('');
      setPendingGeometry(null);
      onRoomsChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore imprevisto');
    }
  }

  const showEmptyState = placedRooms.length === 0 && !backgroundUrl && drawingPoints === null;

  return (
    <div style={hideHeader ? undefined : { padding: '36px 44px', maxWidth: 980 }}>
      {!hideHeader && <SectionLabel>{house.code}</SectionLabel>}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: hideHeader ? 'flex-end' : 'space-between', marginBottom: 8, gap: 10 }}>
        {!hideHeader && (
          <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: 26, color: T.ink, margin: 0 }}>
            Planimetria
          </h1>
        )}
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={startNewRect}
            style={{ display: 'flex', alignItems: 'center', gap: 6, background: T.pine, color: '#F7F7F2', border: 'none', borderRadius: 7, padding: '9px 15px', cursor: 'pointer', fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 500 }}
          >
            <Plus size={15} /> Nuovo ambiente
          </button>
          <button
            onClick={drawingPoints === null ? startDrawing : cancelDrawing}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              background: drawingPoints !== null ? T.ochreDeep : 'none',
              color: drawingPoints !== null ? '#F7F7F2' : T.ink,
              border: `1px solid ${drawingPoints !== null ? T.ochreDeep : T.line}`,
              borderRadius: 7,
              padding: '9px 15px',
              cursor: 'pointer',
              fontFamily: "'Inter', sans-serif",
              fontSize: 13,
              fontWeight: 500,
            }}
          >
            <Pencil size={15} /> {drawingPoints !== null ? 'Annulla disegno' : 'Disegna forma libera'}
          </button>
          <button
            onClick={rotateView}
            disabled={rotating || placedRooms.length === 0}
            title="Ruota la planimetria di 90° — ambienti e asset restano nella posizione reciproca corretta"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              background: 'none',
              color: T.ink,
              border: `1px solid ${T.line}`,
              borderRadius: 7,
              padding: '9px 15px',
              cursor: rotating || placedRooms.length === 0 ? 'default' : 'pointer',
              opacity: rotating || placedRooms.length === 0 ? 0.6 : 1,
              fontFamily: "'Inter', sans-serif",
              fontSize: 13,
              fontWeight: 500,
            }}
          >
            <RotateCw size={15} /> {rotating ? 'Ruoto…' : 'Ruota'}
          </button>
          <button
            onClick={() => backgroundFileInputRef.current?.click()}
            disabled={uploadingBackground}
            style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', color: T.ink, border: `1px solid ${T.line}`, borderRadius: 7, padding: '9px 15px', cursor: 'pointer', fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 500 }}
          >
            <Upload size={15} /> {uploadingBackground ? 'Caricamento…' : backgroundUrl ? 'Sostituisci planimetria' : 'Carica planimetria'}
          </button>
          <input
            ref={backgroundFileInputRef}
            type="file"
            accept=".pdf,.png,.jpg,.jpeg,.webp"
            style={{ display: 'none' }}
            onChange={handleBackgroundFileSelected}
          />
        </div>
      </div>
      <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: T.ink70, margin: '0 0 16px 0' }}>
        {drawingPoints === null
          ? 'Trascina un ambiente per spostarlo, la maniglia in basso a destra per ridimensionarlo (o i vertici, per le forme libere). Trascina un\'icona asset per riposizionarla — rilasciandola in un altro ambiente lo cambia.'
          : drawingPoints.length < 3
            ? 'Clicca sulla planimetria per posizionare i vertici della stanza (almeno 3).'
            : 'Continua a cliccare per aggiungere vertici, oppure clicca vicino al primo punto (o sul pulsante) per chiudere la forma.'}
      </p>

      {backgroundLoading && (
        <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 12.5, color: T.slate, marginBottom: 12 }}>
          Carico la planimetria originale come sfondo…
        </div>
      )}

      {backgroundUrl && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16, fontFamily: "'Inter', sans-serif", fontSize: 12.5, color: T.ink70 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
            <input type="checkbox" checked={showBackground} onChange={(e) => setShowBackground(e.target.checked)} />
            Mostra planimetria originale in trasparenza
          </label>
          {showBackground && (
            <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              Opacità
              <input
                type="range"
                min={0.1}
                max={0.9}
                step={0.05}
                value={backgroundOpacity}
                onChange={(e) => setBackgroundOpacity(Number(e.target.value))}
              />
            </label>
          )}
        </div>
      )}

      {pendingGeometry && (
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 20, background: T.card, border: `1px solid ${T.line}`, borderRadius: 8, padding: 12 }}>
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Nome ambiente"
            autoFocus
            style={{ padding: '7px 10px', borderRadius: 6, border: `1px solid ${T.line}`, fontFamily: "'Inter', sans-serif", fontSize: 12.5, flex: 1 }}
          />
          <select
            value={newType}
            onChange={(e) => setNewType(e.target.value)}
            style={{ padding: '7px 10px', borderRadius: 6, border: `1px solid ${T.line}`, fontFamily: "'Inter', sans-serif", fontSize: 12.5 }}
          >
            {Object.entries(ROOM_TYPES).map(([key, meta]) => (
              <option key={key} value={key}>
                {meta.label}
              </option>
            ))}
          </select>
          <button onClick={submitPendingRoom} disabled={!newName.trim()} style={{ background: T.pine, color: '#F7F7F2', border: 'none', borderRadius: 6, padding: '8px 13px', cursor: 'pointer', fontFamily: "'Inter', sans-serif", fontSize: 12.5, fontWeight: 500 }}>
            Crea
          </button>
          <button onClick={() => setPendingGeometry(null)} style={{ background: 'none', border: `1px solid ${T.line}`, color: T.ink, borderRadius: 6, padding: '8px 13px', cursor: 'pointer', fontFamily: "'Inter', sans-serif", fontSize: 12.5 }}>
            Annulla
          </button>
        </div>
      )}

      {drawingPoints !== null && drawingPoints.length >= 3 && (
        <div style={{ marginBottom: 16 }}>
          <button onClick={finishDrawing} style={{ background: T.pine, color: '#F7F7F2', border: 'none', borderRadius: 6, padding: '8px 13px', cursor: 'pointer', fontFamily: "'Inter', sans-serif", fontSize: 12.5, fontWeight: 500 }}>
            Chiudi forma ({drawingPoints.length} vertici)
          </button>
        </div>
      )}

      {error && <div style={{ color: T.rust, fontFamily: "'Inter', sans-serif", fontSize: 12.5, marginBottom: 16 }}>{error}</div>}

      {showEmptyState ? (
        <div style={{ border: `1px dashed ${T.line}`, borderRadius: 10, padding: '50px 20px', textAlign: 'center', color: T.slate, fontFamily: "'Inter', sans-serif", fontSize: 13.5, marginBottom: 24 }}>
          Nessun ambiente ha ancora una posizione. Aggiungine uno con "Nuovo ambiente" o "Disegna forma libera", oppure carica una planimetria dall'Inbox.
        </div>
      ) : (
        <div
          onClick={handleContainerClick}
          style={{
            position: 'relative',
            width: '100%',
            aspectRatio: (backgroundAspectRatio ?? DEFAULT_ASPECT_RATIO) * (crop.width / crop.height),
            background: T.card,
            border: `1px solid ${T.line}`,
            borderRadius: 10,
            marginBottom: 24,
            overflow: 'hidden',
            userSelect: 'none',
            cursor: drawingPoints !== null ? 'crosshair' : 'default',
          }}
        >
          {/* Il "mondo" intero (sfondo + ambienti + asset) vive qui invariato,
              nelle stesse coordinate 0-1 relative alla pagina originale — è
              questo wrapper a essere ingrandito e spostato per mostrare solo
              l'area ritagliata, non le coordinate dei singoli elementi.
              containerRef punta qui (non al contenitore visibile fuori) così
              tutta la matematica del trascinamento esistente resta invariata:
              getBoundingClientRect() su un elemento trasformato restituisce
              già il rettangolo "virtuale" a piena pagina. */}
          <div
            ref={containerRef}
            style={{
              position: 'absolute',
              inset: 0,
              transformOrigin: '0 0',
              transform: `scale(${1 / crop.width}, ${1 / crop.height}) translate(${-crop.x * 100}%, ${-crop.y * 100}%)`,
            }}
          >
          {backgroundUrl && showBackground && (
            <img
              src={backgroundUrl}
              alt="Planimetria originale"
              draggable={false}
              style={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                objectFit: 'fill',
                opacity: backgroundOpacity,
                pointerEvents: 'none',
              }}
            />
          )}

          {/* Ambienti rettangolari: box HTML posizionati in percentuale */}
          {placedRooms
            .filter((x) => x.geometry.kind === 'rect')
            .map(({ room: r }) => {
              const g = geometryOf(r) as Extract<RoomGeometry, { kind: 'rect' }>;
              const meta = ROOM_TYPES[r.type];
              const Icon = meta.icon;
              const saving = savingId === r.id;
              return (
                <div
                  key={r.id}
                  onPointerDown={(e) => startDrag(e, r, 'move')}
                  style={{
                    position: 'absolute',
                    left: `${g.x * 100}%`,
                    top: `${g.y * 100}%`,
                    width: `${g.width * 100}%`,
                    height: `${g.height * 100}%`,
                    border: `0.75px solid ${meta.color}`,
                    background: `${meta.color}14`,
                    borderRadius: 6,
                    padding: 8,
                    boxSizing: 'border-box',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 4,
                    cursor: drawingPoints !== null ? 'default' : saving ? 'wait' : 'grab',
                    opacity: saving ? 0.6 : 1,
                    pointerEvents: drawingPoints !== null ? 'none' : 'auto',
                    touchAction: 'none',
                  }}
                >
                  {/* Contrappeso allo zoom non uniforme del ritaglio (vedi
                      "crop" sopra e le etichette degli ambienti a forma
                      libera più sotto) — il box del rettangolo segue lo
                      zoom (corretto, riflette le proporzioni reali della
                      stanza), ma icona e testo devono restare a dimensione
                      naturale. */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4, transform: `scale(${crop.width}, ${crop.height})`, transformOrigin: '0 0' }}>
                    <Icon size={14} color={meta.color} />
                    <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 11.5, fontWeight: 500, color: T.ink, pointerEvents: 'none', whiteSpace: 'nowrap' }}>{r.name}</span>
                  </div>
                  {drawingPoints === null && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteRoom(r);
                      }}
                      onPointerDown={(e) => e.stopPropagation()}
                      title="Elimina ambiente"
                      style={{ position: 'absolute', top: 2, right: 2, width: 16, height: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: 'none', cursor: 'pointer', color: T.slate, padding: 0 }}
                    >
                      <X size={12} />
                    </button>
                  )}
                  <div
                    onPointerDown={(e) => startDrag(e, r, 'resize')}
                    style={{
                      position: 'absolute',
                      right: 2,
                      bottom: 2,
                      width: 12,
                      height: 12,
                      borderRadius: 3,
                      background: meta.color,
                      cursor: 'nwse-resize',
                      touchAction: 'none',
                    }}
                  />
                </div>
              );
            })}

          {/* Ambienti a forma libera: un unico SVG condiviso */}
          <svg
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
          >
            {placedRooms
              .filter((x) => x.geometry.kind === 'polygon')
              .map(({ room: r }) => {
                const g = geometryOf(r) as Extract<RoomGeometry, { kind: 'polygon' }>;
                const meta = ROOM_TYPES[r.type];
                const saving = savingId === r.id;
                const pointsAttr = g.points.map((p) => `${p.x * 100},${p.y * 100}`).join(' ');
                return (
                  <g key={r.id} opacity={saving ? 0.6 : 1}>
                    <polygon
                      points={pointsAttr}
                      fill={`${meta.color}22`}
                      stroke={meta.color}
                      strokeWidth={0.15}
                      onPointerDown={(e) => startDrag(e, r, 'move')}
                      style={{ cursor: drawingPoints !== null ? 'default' : 'grab', pointerEvents: drawingPoints !== null ? 'none' : 'auto', touchAction: 'none' }}
                    />
                  </g>
                );
              })}

            {/* Forma in corso di disegno */}
            {drawingPoints && drawingPoints.length > 0 && (
              <g>
                {drawingPoints.length >= 2 && (
                  <polyline
                    points={drawingPoints.map((p) => `${p.x * 100},${p.y * 100}`).join(' ')}
                    fill="none"
                    stroke={T.ochreDeep}
                    strokeWidth={0.4}
                  />
                )}
                {drawingPoints.map((p, i) => (
                  <rect
                    key={i}
                    x={p.x * 100 - (i === 0 ? 1.4 : 1)}
                    y={p.y * 100 - (i === 0 ? 1.4 : 1)}
                    width={i === 0 ? 2.8 : 2}
                    height={i === 0 ? 2.8 : 2}
                    fill={i === 0 ? T.rust : T.ochreDeep}
                  />
                ))}
              </g>
            )}
          </svg>

          {/* Etichette (nome + icona) per gli ambienti a forma libera */}
          {placedRooms
            .filter((x) => x.geometry.kind === 'polygon')
            .map(({ room: r }) => {
              const g = geometryOf(r);
              const meta = ROOM_TYPES[r.type];
              const Icon = meta.icon;
              const c = labelPointOf(g);
              return (
                // Tre livelli: l'esterno segue lo zoom del ritaglio (si
                // sposta insieme alla stanza), il livello intermedio
                // annulla esattamente quello zoom (scale inversa) così
                // testo/icona restano a dimensione naturale invece di
                // distorcersi — lo zoom del wrapper "mondo" (vedi crop
                // sopra) è quasi sempre non uniforme (scaleX ≠ scaleY),
                // quindi senza questo contrappeso icone e testo
                // apparirebbero stirati.
                <div key={r.id} style={{ position: 'absolute', left: `${c.x * 100}%`, top: `${c.y * 100}%` }}>
                  <div style={{ transform: `scale(${crop.width}, ${crop.height})`, transformOrigin: '0 0' }}>
                    <div
                      style={{
                        transform: 'translate(-50%, -50%)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                        pointerEvents: 'none',
                        background: 'rgba(250,250,246,0.85)',
                        padding: '2px 6px',
                        borderRadius: 4,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      <Icon size={12} color={meta.color} />
                      <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, fontWeight: 500, color: T.ink, whiteSpace: 'nowrap' }}>{r.name}</span>
                      {drawingPoints === null && (
                        <button
                          onClick={() => deleteRoom(r)}
                          title="Elimina ambiente"
                          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: 'none', cursor: 'pointer', color: T.slate, padding: 0, pointerEvents: 'auto' }}
                        >
                          <X size={12} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

          {/* Maniglie per spostare i singoli vertici delle forme libere —
              HTML invece di <rect> SVG (come prima) proprio per la stessa
              ragione delle etichette/icone sopra: dentro l'SVG la mira dei
              vertici veniva ridimensionata dal ritaglio (quasi mai uniforme)
              e diventava troppo piccola o imprecisa da agganciare col mouse
              su alcune stanze — soprattutto quelle più piccole, dove i
              vertici sono già ravvicinati tra loro. Qui hanno una
              dimensione fissa sullo schermo, indipendente dallo zoom. */}
          {drawingPoints === null &&
            placedRooms
              .filter((x) => x.geometry.kind === 'polygon')
              .flatMap(({ room: r }) => {
                const g = geometryOf(r) as Extract<RoomGeometry, { kind: 'polygon' }>;
                const meta = ROOM_TYPES[r.type];
                return g.points.map((p, i) => (
                  <div key={`${r.id}-${i}`} style={{ position: 'absolute', left: `${p.x * 100}%`, top: `${p.y * 100}%`, zIndex: 6 }}>
                    <div style={{ transform: `scale(${crop.width}, ${crop.height})`, transformOrigin: '0 0' }}>
                      <div
                        onPointerDown={(e) => startDrag(e, r, 'vertex', i)}
                        style={{
                          transform: 'translate(-50%, -50%)',
                          width: 11,
                          height: 11,
                          borderRadius: 3,
                          background: meta.color,
                          border: '1.5px solid #FAFAF6',
                          boxShadow: '0 1px 2px rgba(0,0,0,0.25)',
                          cursor: 'pointer',
                          pointerEvents: 'auto',
                          touchAction: 'none',
                        }}
                      />
                    </div>
                  </div>
                ));
              })}

          {/* Icone asset: trascinabili, il rilascio in un ambiente diverso
              lo riassegna (vedi startAssetDrag/onAssetMouseUp sopra). */}
          {placedAssets.map(({ asset: a, point }) => {
            const meta = ASSET_TYPES[a.type];
            const Icon = iconForAsset(a);
            const saving = savingAssetId === a.id;
            const hovered = hoveredAssetId === a.id;
            return (
              // Stessa struttura a tre livelli delle etichette ambiente sopra:
              // l'anchor segue lo zoom del ritaglio, il livello intermedio
              // annulla quello zoom (quasi mai uniforme) così il cerchio
              // resta un cerchio invece di un'ellisse e l'icona non si stira.
              <div
                key={a.id}
                style={{
                  position: 'absolute',
                  left: `${point.x * 100}%`,
                  top: `${point.y * 100}%`,
                  display: drawingPoints !== null ? 'none' : undefined,
                  // Sopra alle maniglie dei vertici (zIndex 6): un asset
                  // vicino a un angolo di stanza altrimenti ci finiva
                  // sotto, e diventava impossibile da agganciare col mouse
                  // — bug osservato in pratica, non solo teorico.
                  zIndex: hovered ? 11 : 10,
                }}
              >
                <div style={{ transform: `scale(${crop.width}, ${crop.height})`, transformOrigin: '0 0' }}>
                  <div
                    onPointerDown={(e) => startAssetDrag(e, a, point)}
                    onMouseEnter={() => setHoveredAssetId(a.id)}
                    onMouseLeave={() => setHoveredAssetId(null)}
                    title={a.name}
                    style={{
                      position: 'relative',
                      transform: 'translate(-50%, -50%)',
                      width: 24,
                      height: 24,
                      borderRadius: '50%',
                      background: T.card,
                      border: `1.5px solid ${meta.color}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                      cursor: saving ? 'wait' : 'grab',
                      opacity: saving ? 0.6 : 1,
                      pointerEvents: 'auto',
                      touchAction: 'none',
                    }}
                  >
                    <Icon size={12} color={meta.color} />
                    {hovered && !saving && (
                      <div
                        style={{
                          position: 'absolute',
                          bottom: '100%',
                          left: '50%',
                          transform: 'translate(-50%, -6px)',
                          background: T.ink,
                          color: '#F7F7F2',
                          padding: '3px 8px',
                          borderRadius: 5,
                          fontFamily: "'Inter', sans-serif",
                          fontSize: 11,
                          fontWeight: 500,
                          whiteSpace: 'nowrap',
                          pointerEvents: 'none',
                          zIndex: 8,
                        }}
                      >
                        {a.name}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          </div>
        </div>
      )}

      {unplaced.length > 0 && (
        <>
          <SectionLabel>Ambienti senza posizione ({unplaced.length})</SectionLabel>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {unplaced.map((r) => (
              <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 2, background: T.card, border: `1px solid ${T.line}`, borderRadius: 6 }}>
                <button
                  onClick={() => placeExisting(r)}
                  disabled={savingId === r.id}
                  style={{ fontFamily: "'Inter', sans-serif", fontSize: 12.5, color: T.ink70, background: 'none', border: 'none', padding: '6px 4px 6px 10px', cursor: 'pointer' }}
                >
                  + {r.name}
                </button>
                <button
                  onClick={() => deleteRoom(r)}
                  disabled={savingId === r.id}
                  title="Elimina ambiente"
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: 'none', cursor: 'pointer', color: T.slate, padding: '6px 8px 6px 2px' }}
                >
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
