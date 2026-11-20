import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { ZONES } from '../data/zones';
import { DANUBE, MARKER_COLORS, MARKER_GLYPH, type ParkingMapProps } from './mapTypes';

export default function ParkingMap({ markers, selectedId, onSelect, focus, onMapPress }: ParkingMapProps) {
  const pressRef = useRef(onMapPress);
  pressRef.current = onMapPress;
  const host = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const layer = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    const el = host.current;
    if (!el || map.current) return;
    const m = L.map(el, { zoomControl: false, attributionControl: true }).setView([47.4979, 19.0402], 14);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap, © CARTO',
    }).addTo(m);
    L.polyline(DANUBE, { color: '#8EC5E8', weight: 22, opacity: 0.55, interactive: false }).addTo(m);
    // Legkülső zóna elöl, hogy a belső zónák rajzolódjanak felülre
    [...ZONES].reverse().forEach((z) => {
      L.polygon(
        z.polygon.map((p) => [p.lat, p.lng] as [number, number]),
        { color: z.color, weight: 1.5, fillColor: z.color, fillOpacity: 0.07, interactive: false },
      ).addTo(m);
    });
    m.on('click', (e: L.LeafletMouseEvent) => pressRef.current?.({ lat: e.latlng.lat, lng: e.latlng.lng }));
    layer.current = L.layerGroup().addTo(m);
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

  return <div ref={host} style={{ flex: 1, width: '100%', height: '100%', minHeight: 0, backgroundColor: '#EEF1F4' }} />;
}
