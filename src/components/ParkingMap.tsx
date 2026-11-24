import { MAP_STRINGS } from '../i18nMap';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import MapView, { Marker, Polygon, Polyline, type Region } from 'react-native-maps';
import { CHARGERS, OSM_GARAGES, PARK_RIDES } from '../data/poi';
import { DISTRICTS } from '../data/districts';
import { ZONES } from '../data/zones';
import { MARKER_COLORS, MARKER_GLYPH, type ParkingMapProps } from './mapTypes';

// Natív (iOS / Android) térkép. A webes változat: ParkingMap.web.tsx (MapLibre).
export default function ParkingMap({ markers, selectedId, onSelect, focus, onMapPress, me, onLocate, dark, lang = 'hu' }: ParkingMapProps) {
  const L = MAP_STRINGS[lang];
  const ref = useRef<MapView>(null);
  const [region, setRegion] = useState<Region>({ latitude: 47.4979, longitude: 19.0402, latitudeDelta: 0.05, longitudeDelta: 0.05 });
  const [layers, setLayers] = useState({ garages: true, parkRides: true, chargers: true });
  const [layersOpen, setLayersOpen] = useState(false);
  // Garázsok és töltők csak közelről, és csak a látható részen (sok egyedi jelölő lassítaná a natív térképet)
  const pois = useMemo(() => {
    if (region.latitudeDelta > 0.06) return [];
    const inView = (lat: number, lng: number) =>
      Math.abs(lat - region.latitude) < region.latitudeDelta * 0.6 && Math.abs(lng - region.longitude) < region.longitudeDelta * 0.6;
    const out: { id: string; kind: 'garage' | 'pr' | 'charger' | 'fast'; lat: number; lng: number; title: string; desc: string }[] = [];
    if (layers.garages)
      for (const g of OSM_GARAGES)
        if (inView(g.lat, g.lng))
          out.push({ id: `g${g.id}`, kind: 'garage', lat: g.lat, lng: g.lng, title: g.name ?? (g.kind === 'underground' ? L.underground : L.multiStorey), desc: [g.capacity ? L.spaces(g.capacity) : '', g.operator ?? ''].filter(Boolean).join(' · ') });
    if (layers.parkRides)
      for (const g of PARK_RIDES)
        if (inView(g.lat, g.lng)) out.push({ id: `r${g.id}`, kind: 'pr', lat: g.lat, lng: g.lng, title: g.name ?? 'P+R', desc: [g.capacity ? L.spaces(g.capacity) : '', g.operator ?? ''].filter(Boolean).join(' · ') });
    if (layers.chargers)
      for (const c of CHARGERS)
        if (inView(c.lat, c.lng))
          out.push({ id: `c${c.id}`, kind: (c.maxKw ?? 0) >= 50 ? 'fast' : 'charger', lat: c.lat, lng: c.lng, title: L.charger, desc: [c.capacity ? L.points(c.capacity) : '', c.maxKw ? `${c.maxKw} kW` : '', c.operator ?? ''].filter(Boolean).join(' · ') });
    return out.slice(0, 150);
  }, [region, layers]);

  useEffect(() => {
    if (!ref.current || focus.length === 0) return;
    ref.current.fitToCoordinates(
      focus.map((f) => ({ latitude: f.lat, longitude: f.lng })),
      { edgePadding: { top: 80, right: 60, bottom: 80, left: 60 }, animated: true },
    );
  }, [JSON.stringify(focus)]);

  const locateMe = () => {
    if (me) ref.current?.animateToRegion({ latitude: me.lat, longitude: me.lng, latitudeDelta: 0.006, longitudeDelta: 0.006 });
    onLocate?.();
  };

  return (
    <View style={{ flex: 1 }}>
    <MapView
      ref={ref}
      style={{ flex: 1 }}
      onPress={(e) => {
        // Markerre koppintáskor Androidon a térkép is kap eseményt, azt kihagyjuk
        if ((e.nativeEvent as { action?: string }).action === 'marker-press') return;
        onMapPress?.({ lat: e.nativeEvent.coordinate.latitude, lng: e.nativeEvent.coordinate.longitude });
      }}
      showsUserLocation={!!me}
      showsMyLocationButton={false}
      userInterfaceStyle={dark ? 'dark' : 'light'}
      initialRegion={{ latitude: 47.4979, longitude: 19.0402, latitudeDelta: 0.05, longitudeDelta: 0.05 }}
      onRegionChangeComplete={setRegion}
    >
      {DISTRICTS.flatMap((d) =>
        d.rings.map((r, i) => (
          <Polyline
            key={`${d.name}-${i}`}
            coordinates={r.map(([latitude, longitude]) => ({ latitude, longitude }))}
            strokeColor="#64748B99"
            strokeWidth={1}
          />
        )),
      )}
      {ZONES.flatMap((z) =>
        z.areas.map((rings, i) => (
          <Polygon
            key={`${z.id}-${i}`}
            coordinates={rings[0].map((p) => ({ latitude: p.lat, longitude: p.lng }))}
            holes={rings.slice(1).map((h) => h.map((p) => ({ latitude: p.lat, longitude: p.lng })))}
            strokeColor={z.color}
            fillColor={`${z.color}1A`}
            strokeWidth={1.5}
          />
        )),
      )}
      {pois.map((pt) => (
        <Marker key={pt.id} coordinate={{ latitude: pt.lat, longitude: pt.lng }} title={pt.title} description={pt.desc} tracksViewChanges={false} anchor={{ x: 0.5, y: 0.5 }}>
          <View
            style={{
              width: 26,
              height: 26,
              borderRadius: pt.kind === 'garage' || pt.kind === 'pr' ? 7 : 13,
              backgroundColor: pt.kind === 'garage' ? '#4A1466' : pt.kind === 'pr' ? '#1D4ED8' : '#0E9F6E',
              borderWidth: 2,
              borderColor: pt.kind === 'fast' ? '#FACC15' : '#fff',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ color: '#fff', fontWeight: '800', fontSize: pt.kind === 'garage' ? 15 : pt.kind === 'pr' ? 10 : 13 }}>{pt.kind === 'garage' ? 'P' : pt.kind === 'pr' ? 'P+R' : '⚡'}</Text>
          </View>
        </Marker>
      ))}
      {markers.map((mk) => {
        const sel = mk.id === selectedId;
        const size = mk.kind === 'dest' ? 34 : sel ? 38 : 30;
        return (
          <Marker
            key={mk.id}
            coordinate={{ latitude: mk.lat, longitude: mk.lng }}
            onPress={() => onSelect && mk.kind !== 'dest' && onSelect(mk.id)}
            title={mk.label}
          >
            <View
              style={{
                width: size,
                height: size,
                borderRadius: mk.kind === 'garage' ? 9 : 999,
                backgroundColor: MARKER_COLORS[mk.kind],
                borderWidth: 3,
                borderColor: '#fff',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: size / 2.3 }}>{MARKER_GLYPH[mk.kind]}</Text>
            </View>
          </Marker>
        );
      })}
    </MapView>
      <View style={{ position: 'absolute', right: 12, top: 80, gap: 10, alignItems: 'flex-end' }}>
        <Pressable onPress={() => setLayersOpen((o) => !o)} role="button" accessibilityLabel={L.layers} style={[btn, { backgroundColor: dark ? '#242328' : '#fff' }]}>
          <Text style={{ fontSize: 20, color: dark ? '#F5F4F7' : '#1C1B1F' }}>☰</Text>
        </Pressable>
        {layersOpen && (
          <View style={{ backgroundColor: dark ? '#242328' : '#fff', borderRadius: 14, paddingVertical: 6, elevation: 4, shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 8 }}>
            {(
              [
                ['garages', L.garagesShort(OSM_GARAGES.length), 'P', '#4A1466'],
                ['parkRides', L.parkRides(PARK_RIDES.length), 'P+', '#1D4ED8'],
                ['chargers', L.chargers(CHARGERS.length), '⚡', '#0E9F6E'],
              ] as const
            ).map(([k, label, glyph, color]) => (
              <Pressable key={k} onPress={() => setLayers((l) => ({ ...l, [k]: !l[k] }))} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 10, opacity: layers[k] ? 1 : 0.45 }}>
                <View style={{ width: 22, height: 22, borderRadius: k === 'chargers' ? 11 : 6, backgroundColor: color, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ color: '#fff', fontWeight: '800', fontSize: 12 }}>{glyph}</Text>
                </View>
                <Text style={{ color: dark ? '#F5F4F7' : '#1C1B1F', fontSize: 15 }}>{label}</Text>
                <Text style={{ color: dark ? '#C9A9DC' : '#4A1466', fontWeight: '800' }}>{layers[k] ? '✓' : ''}</Text>
              </Pressable>
            ))}
            <Text style={{ color: '#8E8D96', fontSize: 11, paddingHorizontal: 14, paddingBottom: 4 }}>{L.zoomHint}</Text>
          </View>
        )}
        {onLocate && (
          <Pressable onPress={locateMe} role="button" accessibilityLabel={L.myLocation} style={[btn, { backgroundColor: dark ? '#242328' : '#fff' }]}>
            <Text style={{ fontSize: 22, color: me ? '#2563EB' : dark ? '#C9A9DC' : '#4A1466' }}>◎</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const btn = { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', elevation: 3, shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 6 } as const;
