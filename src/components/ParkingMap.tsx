import { useEffect, useRef } from 'react';
import { Text, View } from 'react-native';
import MapView, { Marker, Polygon } from 'react-native-maps';
import { ZONES } from '../data/zones';
import { MARKER_COLORS, MARKER_GLYPH, type ParkingMapProps } from './mapTypes';

// Natív (iOS / Android) térkép. A webes változat: ParkingMap.web.tsx (Leaflet).
export default function ParkingMap({ markers, selectedId, onSelect, focus }: ParkingMapProps) {
  const ref = useRef<MapView>(null);

  useEffect(() => {
    if (!ref.current || focus.length === 0) return;
    ref.current.fitToCoordinates(
      focus.map((f) => ({ latitude: f.lat, longitude: f.lng })),
      { edgePadding: { top: 80, right: 60, bottom: 80, left: 60 }, animated: true },
    );
  }, [JSON.stringify(focus)]);

  return (
    <MapView
      ref={ref}
      style={{ flex: 1 }}
      initialRegion={{ latitude: 47.4979, longitude: 19.0402, latitudeDelta: 0.05, longitudeDelta: 0.05 }}
    >
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
  );
}
