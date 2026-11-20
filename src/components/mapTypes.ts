import type { LatLng } from '../data/zones';

export type MarkerKind = 'dest' | 'fastest' | 'cheapest' | 'garage' | 'here';

export type MapMarker = LatLng & {
  id: string;
  kind: MarkerKind;
  label: string;
};

export type ParkingMapProps = {
  markers: MapMarker[];
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  /** Ezekre a pontokra illeszti a nézetet */
  focus: LatLng[];
  /** Koppintás a térképre (\u201eParkolás itt\u201d) */
  onMapPress?: (pt: LatLng) => void;
};

export const MARKER_COLORS: Record<MarkerKind, string> = {
  dest: '#111827',
  fastest: '#16A34A',
  cheapest: '#2563EB',
  garage: '#7C3AED',
  here: '#0F766E',
};

export const MARKER_GLYPH: Record<MarkerKind, string> = {
  dest: '★',
  fastest: '1',
  cheapest: '2',
  garage: 'P',
  here: '●',
};

// Stilizált Duna-vonal, hogy csempe (tile) nélkül is olvasható legyen a térkép.
export const DANUBE: [number, number][] = [
  [47.575, 19.05], [47.556, 19.047], [47.54, 19.046], [47.527, 19.047], [47.516, 19.046],
  [47.508, 19.044], [47.5, 19.046], [47.493, 19.049], [47.487, 19.055], [47.479, 19.06],
  [47.47, 19.0645], [47.458, 19.068], [47.44, 19.072],
];
