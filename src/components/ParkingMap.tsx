import { useEffect, useRef } from 'react';
import { Pressable, Text, View } from 'react-native';
import MapView, { Marker, Polygon, Polyline } from 'react-native-maps';
import { DISTRICTS } from '../data/districts';
import { ZONES } from '../data/zones';
import { MARKER_COLORS, MARKER_GLYPH, type ParkingMapProps } from './mapTypes';

// Natív (iOS / Android) térkép. A webes változat: ParkingMap.web.tsx (Leaflet).
export default function ParkingMap({ markers, selectedId, onSelect, focus, onMapPress, me, onLocate }: ParkingMapProps) {
  const ref = useRef<MapView>(null);

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
      initialRegion={{ latitude: 47.4979, longitude: 19.0402, latitudeDelta: 0.05, longitudeDelta: 0.05 }}
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
      {[...ZONES].reverse().map((z) => (
        <Polygon
          key={z.id}
          coordinates={z.polygon.map((p) => ({ latitude: p.lat, longitude: p.lng }))}
          strokeColor={z.color}
          fillColor={`${z.color}1A`}
          strokeWidth={1.5}
        />
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
      {onLocate && (
        <Pressable
          onPress={locateMe}
          accessibilityLabel="Saját helyzetem"
          style={{ position: 'absolute', right: 12, top: 80, width: 48, height: 48, borderRadius: 24, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', elevation: 3 }}
        >
          <Text style={{ fontSize: 22, color: me ? '#2563EB' : '#0F172A' }}>◎</Text>
        </Pressable>
      )}
    </View>
  );
}
