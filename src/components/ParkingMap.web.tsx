import { useEffect, useRef, useState } from 'react';
import maplibregl, { type GeoJSONSource, type StyleSpecification } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { ZONES } from '../data/zones';
import { DISTRICTS } from '../data/districts';
import { CHARGERS, OSM_GARAGES } from '../data/poi';
import { DISTRICT_CENTERS } from '../logic/geo';
import { MARKER_COLORS, MARKER_GLYPH, type ParkingMapProps } from './mapTypes';

// Vektoros alaptérkép: MapLibre GL + OpenFreeMap (ingyenes, kulcs és regisztráció nélkül, üzleti célra is).
// Ugyanaz az OpenMapTiles adatséma, amit a városi közlekedési appok is használnak.
const STYLE_URL = { light: 'https://tiles.openfreemap.org/styles/bright', dark: 'https://tiles.openfreemap.org/styles/dark' };
// Ha az alaptérkép nem érhető el (offline, beágyazott demó), akkor is látszanak a zónák és a pontok
const fallback = (dark?: boolean): StyleSpecification => ({
  version: 8,
  sources: {},
  layers: [{ id: 'bg', type: 'background', paint: { 'background-color': dark ? '#1E1D22' : '#F2EFE6' } }],
});

const GARAGE_COLOR = '#4A1466';
const ZONE_COLOR = Object.fromEntries(ZONES.map((z) => [z.id, z.color])) as Record<string, string>;
const DAYS: Record<string, string> = { Mo: 'H', Tu: 'K', We: 'Sze', Th: 'Cs', Fr: 'P', Sa: 'Szo', Su: 'V' };
const huHours = (h: string) => h.replace(/\b(Mo|Tu|We|Th|Fr|Sa|Su)\b/g, (d) => DAYS[d]);
const CHARGER_COLOR = '#0E9F6E';

type Layers = { zones: boolean; garages: boolean; chargers: boolean };

const fc = (features: GeoJSON.Feature[]): GeoJSON.FeatureCollection => ({ type: 'FeatureCollection', features });
const ring = (pts: { lat: number; lng: number }[]) => {
  const r = pts.map((p) => [p.lng, p.lat]);
  return [...r, r[0]];
};

const ZONES_GJ = fc(
  ZONES.map((z) => ({ type: 'Feature', properties: { color: z.color, id: z.id }, geometry: { type: 'MultiPolygon', coordinates: z.areas.map((rings) => rings.map(ring)) } })),
);
const DISTRICTS_GJ = fc(
  DISTRICTS.flatMap((d) => d.rings.map((r) => ({ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: ring(r.map(([lat, lng]) => ({ lat, lng }))) } }))),
);
const GARAGES_GJ = fc(
  OSM_GARAGES.map((g) => ({ type: 'Feature', properties: { id: g.id }, geometry: { type: 'Point', coordinates: [g.lng, g.lat] } })),
);
const CHARGERS_GJ = fc(
  CHARGERS.map((c) => ({ type: 'Feature', properties: { id: c.id, fast: (c.maxKw ?? 0) >= 50 ? 1 : 0 }, geometry: { type: 'Point', coordinates: [c.lng, c.lat] } })),
);

const esc = (s: string) => s.replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[ch]!);

function garageHtml(id: string) {
  const g = OSM_GARAGES.find((x) => x.id === id);
  if (!g) return '';
  const rows = [
    g.kind === 'underground' ? 'Mélygarázs' : 'Parkolóház',
    g.capacity ? `${g.capacity} férőhely` : null,
    g.fee === 'no' ? 'Ingyenes' : g.fee === 'yes' ? 'Fizetős' : null,
    g.access === 'customers' ? 'Vásárlóknak' : null,
    g.hours ? `Nyitva: ${g.hours}` : null,
    g.operator,
  ].filter(Boolean) as string[];
  return `<b>${esc(g.name ?? (g.kind === 'underground' ? 'Mélygarázs' : 'Parkolóház'))}</b><br>${rows.map(esc).join('<br>')}`;
}

function chargerHtml(id: string) {
  const c = CHARGERS.find((x) => x.id === id);
  if (!c) return '';
  const rows = [
    c.sockets.length ? c.sockets.join(', ') : null,
    c.maxKw ? `max. ${c.maxKw} kW` : null,
    c.capacity ? `${c.capacity} töltőpont` : null,
    c.operator,
  ].filter(Boolean) as string[];
  return `<b>⚡ ${esc(c.name ?? 'Elektromos töltő')}</b><br>${rows.map(esc).join('<br>')}`;
}

/** Kör sokszögként (méterben megadott sugár), a pontossági körhöz */
function circle(lat: number, lng: number, radiusM: number) {
  const pts: number[][] = [];
  for (let i = 0; i <= 48; i++) {
    const a = (i / 48) * 2 * Math.PI;
    pts.push([lng + (radiusM / (111320 * Math.cos((lat * Math.PI) / 180))) * Math.cos(a), lat + (radiusM / 110540) * Math.sin(a)]);
  }
  return pts;
}

/** Térképikonok vászonra rajzolva (nincs külső sprite-fájl); 2x felbontás az éles megjelenéshez */
let iconCache: Record<string, ImageData> | null = null;
function POI_ICONS(): Record<string, ImageData> {
  if (iconCache) return iconCache;
  const S = 52;
  const make = (draw: (c: CanvasRenderingContext2D) => void) => {
    const cv = document.createElement('canvas');
    cv.width = cv.height = S;
    const c = cv.getContext('2d')!;
    draw(c);
    return c.getImageData(0, 0, S, S);
  };
  const shadow = (c: CanvasRenderingContext2D) => {
    c.shadowColor = 'rgba(0,0,0,.35)';
    c.shadowBlur = 4;
    c.shadowOffsetY = 1;
  };
  const roundRect = (c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) => {
    c.beginPath();
    c.moveTo(x + r, y);
    c.arcTo(x + w, y, x + w, y + h, r);
    c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r);
    c.arcTo(x, y, x + w, y, r);
    c.closePath();
  };
  const garage = make((c) => {
    shadow(c);
    roundRect(c, 5, 5, 42, 42, 11);
    c.fillStyle = '#fff';
    c.fill();
    c.shadowColor = 'transparent';
    roundRect(c, 9, 9, 34, 34, 8);
    c.fillStyle = GARAGE_COLOR;
    c.fill();
    c.fillStyle = '#fff';
    c.font = '800 26px system-ui,-apple-system,Segoe UI,sans-serif';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText('P', 26, 27.5);
  });
  const charger = (fast: boolean) =>
    make((c) => {
      shadow(c);
      c.beginPath();
      c.arc(26, 26, 21, 0, Math.PI * 2);
      c.fillStyle = fast ? '#FACC15' : '#fff';
      c.fill();
      c.shadowColor = 'transparent';
      c.beginPath();
      c.arc(26, 26, 17, 0, Math.PI * 2);
      c.fillStyle = CHARGER_COLOR;
      c.fill();
      // villám
      c.beginPath();
      c.moveTo(29, 12);
      c.lineTo(17, 29);
      c.lineTo(25, 29);
      c.lineTo(22, 40);
      c.lineTo(35, 22);
      c.lineTo(27, 22);
      c.closePath();
      c.fillStyle = '#fff';
      c.fill();
    });
  iconCache = { 'poi-garage': garage, 'poi-charger': charger(false), 'poi-charger-fast': charger(true) };
  return iconCache;
}

export default function ParkingMap({ markers, selectedId, onSelect, focus, onMapPress, me, onLocate, controlsTop, zoneStreets, dark }: ParkingMapProps) {
  const host = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const domMarkers = useRef<maplibregl.Marker[]>([]);
  const pressRef = useRef(onMapPress);
  pressRef.current = onMapPress;
  const meRef = useRef(me);
  meRef.current = me;
  const wantCenter = useRef(false);
  const [ready, setReady] = useState(0);
  const [layers, setLayers] = useState<Layers>({ zones: true, garages: true, chargers: true });
  const layersRef = useRef(layers);
  layersRef.current = layers;
  const [layersOpen, setLayersOpen] = useState(false);

  useEffect(() => {
    const el = host.current;
    if (!el || map.current) return;
    const m = new maplibregl.Map({
      container: el,
      style: fallback(dark),
      center: [19.0402, 47.4979],
      zoom: 13,
      maxZoom: 19,
      attributionControl: { compact: true, customAttribution: '© OpenStreetMap közreműködők · OpenFreeMap · OpenMapTiles' },
      dragRotate: false,
      pitchWithRotate: false,
    });
    m.touchZoomRotate.disableRotation();
    map.current = m;

    // Saját rétegek: zónák, kerülethatárok, garázsok, töltők, saját helyzet. Stílusváltás után újra kellenek.
    const addOverlays = () => {
      if (m.getSource('zones')) return;
      const before = m.getStyle().layers.find((l) => l.type === 'symbol')?.id; // a feliratok alá
      m.addSource('districts', { type: 'geojson', data: DISTRICTS_GJ });
      m.addLayer({ id: 'districts', type: 'line', source: 'districts', paint: { 'line-color': '#6B6A73', 'line-width': 1, 'line-opacity': 0.45, 'line-dasharray': [3, 3] } }, before);
      m.addSource('zones', { type: 'geojson', data: ZONES_GJ });
      m.addLayer({ id: 'zones-fill', type: 'fill', source: 'zones', paint: { 'fill-color': ['get', 'color'], 'fill-opacity': ['interpolate', ['linear'], ['zoom'], 13, 0.08, 16, 0.03] } }, before);
      m.addLayer({ id: 'zones-line', type: 'line', source: 'zones', paint: { 'line-color': ['get', 'color'], 'line-width': 2.5, 'line-opacity': ['interpolate', ['linear'], ['zoom'], 13, 0.85, 15, 0.3] } }, before);
      // Utcaszintű zónák (OSM): közelről ezek a pontos határok, távolról a sokszög ad áttekintést
      m.addSource('zone-streets', { type: 'geojson', data: fc([]) });
      m.addLayer(
        {
          id: 'zone-streets',
          type: 'line',
          source: 'zone-streets',
          minzoom: 12.5,
          layout: { 'line-cap': 'round', 'line-join': 'round' },
          paint: {
            'line-color': ['match', ['get', 'z'], 'A', ZONE_COLOR.A, 'B', ZONE_COLOR.B, 'C', ZONE_COLOR.C, ZONE_COLOR.D],
            'line-width': ['interpolate', ['linear'], ['zoom'], 12.5, 1.5, 15, 4, 18, 9],
            'line-opacity': 0.75,
          },
        },
        before,
      );
      m.addSource('me', { type: 'geojson', data: fc([]) });
      m.addLayer({ id: 'me-acc', type: 'fill', source: 'me', filter: ['==', ['geometry-type'], 'Polygon'], paint: { 'fill-color': '#3B82F6', 'fill-opacity': 0.12 } });
      m.addLayer({ id: 'me-dot', type: 'circle', source: 'me', filter: ['==', ['geometry-type'], 'Point'], paint: { 'circle-radius': 8, 'circle-color': '#2563EB', 'circle-stroke-color': '#fff', 'circle-stroke-width': 3 } });
      // Saját rajzolású ikonok: garázs = lila négyzet „P” betűvel, töltő = zöld kör villámmal (gyorstöltő: sárga keret)
      for (const [name, img] of Object.entries(POI_ICONS())) if (!m.hasImage(name)) m.addImage(name, img, { pixelRatio: 2 });
      const iconSize: maplibregl.ExpressionSpecification = ['interpolate', ['linear'], ['zoom'], 11, 0.55, 14, 0.85, 17, 1.1];
      m.addSource('chargers', { type: 'geojson', data: CHARGERS_GJ });
      m.addLayer({
        id: 'chargers',
        type: 'symbol',
        source: 'chargers',
        minzoom: 12,
        layout: {
          'icon-image': ['case', ['==', ['get', 'fast'], 1], 'poi-charger-fast', 'poi-charger'],
          'icon-size': iconSize,
          'icon-allow-overlap': true,
          'icon-padding': 0,
        },
      });
      m.addSource('garages', { type: 'geojson', data: GARAGES_GJ });
      m.addLayer({
        id: 'garages',
        type: 'symbol',
        source: 'garages',
        minzoom: 11,
        layout: { 'icon-image': 'poi-garage', 'icon-size': iconSize, 'icon-allow-overlap': true, 'icon-padding': 0 },
      });
      applyVisibility(m, layersRef.current);
      setReady((n) => n + 1);
    };
    m.on('style.load', addOverlays);
    if (m.isStyleLoaded()) addOverlays();


    // Kerületszámok (HTML címkék, nem függnek a stílus betűkészletétől)
    DISTRICT_CENTERS.forEach((c) => {
      const d = document.createElement('div');
      d.textContent = c.name.split(' ')[0];
      d.style.cssText = 'font:700 11px system-ui,sans-serif;color:#5E5D66;opacity:.75;pointer-events:none';
      new maplibregl.Marker({ element: d }).setLngLat([c.lng, c.lat]).addTo(m);
    });

    const popup = new maplibregl.Popup({ closeButton: false, maxWidth: '260px', offset: 10 });
    const showPopup = (html: string, at: maplibregl.LngLatLike) => popup.setLngLat(at).setHTML(`<div style="font:13px/1.4 system-ui,sans-serif;color:#1C1B1F">${html}</div>`).addTo(m);
    m.on('click', (e) => {
      const street = m.queryRenderedFeatures([[e.point.x - 6, e.point.y - 6], [e.point.x + 6, e.point.y + 6]], { layers: ['zone-streets'].filter((l) => m.getLayer(l)) })[0];
      const hit = m.queryRenderedFeatures(e.point, { layers: ['garages', 'chargers'].filter((l) => m.getLayer(l)) })[0];
      if (!hit && street && !pressRef.current) {
        const p = street.properties as { z: string; n?: string; h?: string };
        showPopup(`<b>${esc(p.z)} zóna</b>${p.n ? ` · ${esc(p.n)}` : ''}${p.h ? `<br>Fizetős: ${esc(huHours(p.h))}` : ''}`, e.lngLat);
        return;
      }
      if (hit) {
        const id = String(hit.properties?.id);
        showPopup(hit.layer.id === 'garages' ? garageHtml(id) : chargerHtml(id), e.lngLat);
        return;
      }
      popup.remove();
      pressRef.current?.({ lat: e.lngLat.lat, lng: e.lngLat.lng });
    });
    for (const l of ['garages', 'chargers']) {
      m.on('mouseenter', l, () => (m.getCanvas().style.cursor = 'pointer'));
      m.on('mouseleave', l, () => (m.getCanvas().style.cursor = ''));
    }
    const ro = new ResizeObserver(() => m.resize());
    ro.observe(el);
    return () => {
      ro.disconnect();
      m.remove();
      map.current = null;
    };
  }, []);

  // Valódi alaptérkép (világos vagy sötét); ha nem érhető el, marad a háttér + saját rétegek
  useEffect(() => {
    const m = map.current;
    if (!m) return;
    let live = true;
    fetch(STYLE_URL[dark ? 'dark' : 'light'])
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((style: StyleSpecification) => live && map.current === m && m.setStyle(style))
      .catch(() => live && map.current === m && m.setStyle(fallback(dark)));
    return () => {
      live = false;
    };
  }, [dark]);

  useEffect(() => {
    if (map.current && map.current.getSource('zones')) applyVisibility(map.current, layers);
  }, [layers, ready]);

  useEffect(() => {
    const src = map.current?.getSource('zone-streets') as GeoJSONSource | undefined;
    if (!src || !zoneStreets?.length) return;
    src.setData(fc(zoneStreets.map((st) => ({ type: 'Feature', properties: { z: st.z, n: st.n, h: st.h }, geometry: { type: 'LineString', coordinates: st.c } }))));
  }, [zoneStreets, ready]);

  // Célpont és ajánlott helyek jelölői
  useEffect(() => {
    const m = map.current;
    if (!m) return;
    domMarkers.current.forEach((mk) => mk.remove());
    domMarkers.current = markers.map((mk) => {
      const sel = mk.id === selectedId;
      const size = mk.kind === 'dest' ? 34 : sel ? 40 : 32;
      const el = document.createElement('div');
      el.title = mk.label;
      el.style.cssText = `width:${size}px;height:${size}px;border-radius:${mk.kind === 'garage' ? 9 : 999}px;background:${MARKER_COLORS[mk.kind]};color:#fff;display:flex;align-items:center;justify-content:center;font:700 ${size / 2.3}px system-ui,sans-serif;border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.35);cursor:${onSelect && mk.kind !== 'dest' ? 'pointer' : 'default'};z-index:${mk.kind === 'dest' ? 3 : sel ? 2 : 1}`;
      el.textContent = MARKER_GLYPH[mk.kind];
      if (onSelect && mk.kind !== 'dest')
        el.addEventListener('click', (e) => {
          e.stopPropagation();
          onSelect(mk.id);
        });
      return new maplibregl.Marker({ element: el }).setLngLat([mk.lng, mk.lat]).addTo(m);
    });
  }, [markers, selectedId, onSelect]);

  // Nézet illesztése; telefonon az alsó lap takarja a térkép alját, ezt kihagyjuk
  useEffect(() => {
    const m = map.current;
    if (!m || focus.length === 0) return;
    const h = m.getContainer().clientHeight;
    const padding = controlsTop ? { top: 90, left: 40, right: 70, bottom: Math.round(h * 0.55) + 30 } : { top: 60, left: 60, right: 90, bottom: 60 };
    m.stop();
    if (focus.length === 1) m.jumpTo({ center: [focus[0].lng, focus[0].lat], zoom: 15, padding });
    else {
      const b = new maplibregl.LngLatBounds();
      focus.forEach((f) => b.extend([f.lng, f.lat]));
      m.fitBounds(b, { padding, maxZoom: 16, animate: false });
    }
  }, [JSON.stringify(focus), controlsTop]);

  // Kék pont pontossági körrel
  useEffect(() => {
    const m = map.current;
    const src = m?.getSource('me') as GeoJSONSource | undefined;
    if (!m || !src) return;
    src.setData(
      me
        ? fc([
            { type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: [circle(me.lat, me.lng, me.accuracy)] } },
            { type: 'Feature', properties: {}, geometry: { type: 'Point', coordinates: [me.lng, me.lat] } },
          ])
        : fc([]),
    );
    if (me && wantCenter.current) {
      wantCenter.current = false;
      m.easeTo({ center: [me.lng, me.lat], zoom: 17 });
    }
  }, [me?.lat, me?.lng, me?.accuracy, ready]);

  const locateMe = () => {
    const m = map.current;
    if (meRef.current && m) m.easeTo({ center: [meRef.current.lng, meRef.current.lat], zoom: 17 });
    else wantCenter.current = true;
    onLocate?.();
  };

  // Kerek fehér térképgombok (mint a városi közlekedési appokban)
  const btn: React.CSSProperties = {
    width: 52, height: 52, borderRadius: 26, border: 'none', background: dark ? '#242328' : '#fff', color: dark ? '#F5F4F7' : '#1C1B1F',
    font: '400 30px system-ui,sans-serif', boxShadow: '0 2px 8px rgba(0,0,0,.2)', cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1,
  };
  const toggle = (k: keyof Layers) => setLayers((l) => ({ ...l, [k]: !l[k] }));
  const legend: [keyof Layers, string, string][] = [
    ['zones', 'Parkolási zónák', '#E8590C'],
    ['garages', `Mélygarázsok, parkolóházak (${OSM_GARAGES.length})`, GARAGE_COLOR],
    ['chargers', `Elektromos töltők (${CHARGERS.length})`, CHARGER_COLOR],
  ];

  return (
    <div style={{ position: 'relative', flex: 1, width: '100%', height: '100%', minHeight: 0 }}>
      <style>{`.maplibregl-ctrl-attrib{font-size:11px}.maplibregl-popup-content{border-radius:12px;box-shadow:0 4px 16px rgba(0,0,0,.18);padding:10px 12px}`}</style>
      <div ref={host} style={{ position: 'absolute', inset: 0, backgroundColor: dark ? '#1E1D22' : '#F2EFE6' }} />
      {/* Rétegválasztó (jobbra fent, az óra mellett / alatt) */}
      <div style={{ position: 'absolute', zIndex: 1000, ...(controlsTop ? { right: 12, top: 80 } : { right: 192, top: 26 }) }}>
        <button aria-label="Térképrétegek" style={{ ...btn, ...(controlsTop ? { width: 44, height: 44 } : {}) }} onClick={() => setLayersOpen((o) => !o)}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill={dark ? '#F5F4F7' : '#1C1B1F'} aria-hidden>
            <path d="M12 2 1 8l11 6 11-6-11-6Zm0 14.2L3.2 11.4 1 12.6 12 18.6l11-6-2.2-1.2L12 16.2Zm0 4.6-8.8-4.8L1 17.2 12 23l11-5.8-2.2-1.2L12 20.8Z" />
          </svg>
        </button>
        {layersOpen && (
          <div style={{ position: 'absolute', top: controlsTop ? 52 : 60, right: 0, width: 270, background: dark ? '#242328' : '#fff', borderRadius: 14, padding: '8px 0', boxShadow: '0 4px 16px rgba(0,0,0,.18)', font: '14px system-ui,sans-serif' }}>
            {legend.map(([k, label, color]) => (
              <label key={k} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 14px', cursor: 'pointer', color: dark ? '#F5F4F7' : '#1C1B1F' }}>
                <input type="checkbox" checked={layers[k]} onChange={() => toggle(k)} style={{ accentColor: '#4A1466', width: 18, height: 18 }} />
                <span style={{ width: 18, height: 18, borderRadius: k === 'garages' ? 5 : 9, background: color, flex: 'none', color: '#fff', font: '800 11px system-ui,sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{k === 'garages' ? 'P' : k === 'chargers' ? '⚡' : ''}</span>
                {label}
              </label>
            ))}
            <div style={{ padding: '6px 14px 4px', color: '#5E5D66', fontSize: 11 }}>Garázsok, töltők: © OpenStreetMap közreműködők</div>
          </div>
        )}
      </div>
      <div
        style={{
          position: 'absolute', right: controlsTop ? 12 : 24, ...(controlsTop ? { top: 134 } : { bottom: 40 }), zIndex: 999,
          display: 'flex', flexDirection: 'column', gap: controlsTop ? 10 : 14, transform: controlsTop ? 'scale(.85)' : undefined, transformOrigin: 'top right',
        }}
      >
        {onLocate && (
          <button aria-label="Saját helyzetem" style={{ ...btn, fontSize: 24, color: me ? '#2563EB' : dark ? '#C9A9DC' : '#4A1466' }} onClick={locateMe}>◎</button>
        )}
        <button aria-label="Nagyítás" style={btn} onClick={() => map.current?.zoomIn()}>+</button>
        <button aria-label="Kicsinyítés" style={btn} onClick={() => map.current?.zoomOut()}>−</button>
      </div>
    </div>
  );
}

function applyVisibility(m: maplibregl.Map, l: Layers) {
  const set = (id: string, on: boolean) => m.getLayer(id) && m.setLayoutProperty(id, 'visibility', on ? 'visible' : 'none');
  set('zones-fill', l.zones);
  set('zones-line', l.zones);
  set('zone-streets', l.zones);
  set('garages', l.garages);
  set('chargers', l.chargers);
}
