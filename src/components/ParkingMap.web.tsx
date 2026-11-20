import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { ZONES } from '../data/zones';
import { DISTRICTS } from '../data/districts';
import { DISTRICT_CENTERS } from '../logic/geo';
import { MARKER_COLORS, MARKER_GLYPH, type ParkingMapProps } from './mapTypes';

export default function ParkingMap({ markers, selectedId, onSelect, focus, onMapPress, me, onLocate, controlsTop }: ParkingMapProps) {
  const meRef = useRef(me);
  meRef.current = me;
  const wantCenter = useRef(false);
  const meLayer = useRef<L.LayerGroup | null>(null);
  const pressRef = useRef(onMapPress);
  pressRef.current = onMapPress;
  const host = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const layer = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    const el = host.current;
    if (!el || map.current) return;
    const m = L.map(el, { zoomControl: false, attributionControl: true }).setView([47.4979, 19.0402], 14);
    // Részletes, színes alaptérkép (utcák, nevek, épületek, parkok, metró)
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      maxZoom: 20,
      subdomains: 'abcd',
      attribution: '© OpenStreetMap közreműködők, © CARTO',
    }).addTo(m);
    // Valódi kerülethatárok (OSM) és kerületszámok
    DISTRICTS.forEach((d) =>
      d.rings.forEach((r) => L.polygon(r, { color: '#64748B', weight: 1, opacity: 0.35, dashArray: '4 4', fill: false, interactive: false }).addTo(m)),
    );
    DISTRICT_CENTERS.forEach((c) =>
      L.marker([c.lat, c.lng], {
        interactive: false,
        icon: L.divIcon({
          className: '',
          iconSize: [40, 14],
          iconAnchor: [20, 7],
          html: `<div style="font:700 11px system-ui,sans-serif;color:#475569;text-align:center;opacity:.8">${c.name.split(' ')[0]}</div>`,
        }),
      }).addTo(m),
    );
        // Legkülső zóna elöl, hogy a belső zónák rajzolódjanak felülre
    [...ZONES].reverse().forEach((z) => {
      L.polygon(
        z.polygon.map((p) => [p.lat, p.lng] as [number, number]),
        { color: z.color, weight: 2, opacity: 0.8, fillColor: z.color, fillOpacity: 0.05, interactive: false },
      ).addTo(m);
    });
    m.on('click', (e: L.LeafletMouseEvent) => pressRef.current?.({ lat: e.latlng.lat, lng: e.latlng.lng }));
    layer.current = L.layerGroup().addTo(m);
    meLayer.current = L.layerGroup().addTo(m);
    map.current = m;
    const timer = setTimeout(() => m.invalidateSize(), 50);
    return () => {
      clearTimeout(timer);
      m.remove();
      map.current = null;
    };
  }, []);

  useEffect(() => {
    const m = map.current;
    const g = layer.current;
    if (!m || !g) return;
    g.clearLayers();
    markers.forEach((mk) => {
      const sel = mk.id === selectedId;
      const size = mk.kind === 'dest' ? 34 : sel ? 38 : 30;
      const html = `<div style="width:${size}px;height:${size}px;border-radius:${mk.kind === 'garage' ? 9 : 999}px;background:${MARKER_COLORS[mk.kind]};color:#fff;display:flex;align-items:center;justify-content:center;font:700 ${size / 2.3}px system-ui,sans-serif;border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.35);${sel ? 'transform:scale(1.05);' : ''}">${MARKER_GLYPH[mk.kind]}</div>`;
      const marker = L.marker([mk.lat, mk.lng], {
        icon: L.divIcon({ html, className: '', iconSize: [size, size], iconAnchor: [size / 2, size / 2] }),
        zIndexOffset: mk.kind === 'dest' ? 1000 : sel ? 900 : 0,
        title: mk.label,
      });
      if (onSelect && mk.kind !== 'dest') marker.on('click', () => onSelect(mk.id));
      marker.addTo(g);
    });
  }, [markers, selectedId, onSelect]);

  useEffect(() => {
    const m = map.current;
    if (!m || focus.length === 0) return;
    // A térkép magassága lépésenként változik: méret frissítése, futó animáció leállítása
    m.stop();
    m.invalidateSize({ animate: false });
    if (focus.length === 1) m.setView([focus[0].lat, focus[0].lng], 15, { animate: false });
    else
      m.fitBounds(L.latLngBounds(focus.map((f) => [f.lat, f.lng] as [number, number])), {
        paddingTopLeft: [40, 40],
        paddingBottomRight: [40, 40],
        maxZoom: 16,
        animate: false,
      });
  }, [JSON.stringify(focus)]);

  // Kék pont pontossági körrel
  useEffect(() => {
    const m = map.current;
    const g = meLayer.current;
    if (!m || !g) return;
    g.clearLayers();
    if (!me) return;
    L.circle([me.lat, me.lng], { radius: me.accuracy, color: '#2563EB', weight: 1, opacity: 0.4, fillColor: '#3B82F6', fillOpacity: 0.12, interactive: false }).addTo(g);
    L.circleMarker([me.lat, me.lng], { radius: 8, color: '#fff', weight: 3, fillColor: '#2563EB', fillOpacity: 1, interactive: false }).addTo(g);
    if (wantCenter.current) {
      wantCenter.current = false;
      m.setView([me.lat, me.lng], 17, { animate: true });
    }
  }, [me?.lat, me?.lng, me?.accuracy]);

  const locateMe = () => {
    const m = map.current;
    if (meRef.current && m) m.setView([meRef.current.lat, meRef.current.lng], 17, { animate: true });
    else wantCenter.current = true;
    onLocate?.();
  };

  // Kerek fehér térképgombok jobbra lent (mint a városi közlekedési appokban)
  const btn: React.CSSProperties = {
    width: 52, height: 52, borderRadius: 26, border: 'none', background: '#fff', color: '#1C1B1F',
    font: '400 30px system-ui,sans-serif', boxShadow: '0 2px 8px rgba(0,0,0,.2)', cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1,
  };

  return (
    <div style={{ position: 'relative', flex: 1, width: '100%', height: '100%', minHeight: 0 }}>
      <style>{`.parkolj-map .leaflet-tile-pane{filter:sepia(.22) saturate(1.15) brightness(1.02)}.parkolj-map .leaflet-control-attribution{background:rgba(255,255,255,.75);font-size:11px}`}</style>
      <div ref={host} className="parkolj-map" style={{ position: 'absolute', inset: 0, backgroundColor: '#F2EFE6' }} />
      <div style={{ position: 'absolute', right: controlsTop ? 12 : 24, ...(controlsTop ? { top: 80 } : { bottom: 40 }), zIndex: 1000, display: 'flex', flexDirection: 'column', gap: controlsTop ? 10 : 14, transform: controlsTop ? 'scale(.85)' : undefined, transformOrigin: 'top right' }}>
        {onLocate && (
          <button aria-label="Saját helyzetem" style={{ ...btn, fontSize: 24, color: me ? '#2563EB' : '#4A1466' }} onClick={locateMe}>◎</button>
        )}
        <button aria-label="Nagyítás" style={btn} onClick={() => map.current?.zoomIn()}>+</button>
        <button aria-label="Kicsinyítés" style={btn} onClick={() => map.current?.zoomOut()}>−</button>
      </div>
    </div>
  );
}
