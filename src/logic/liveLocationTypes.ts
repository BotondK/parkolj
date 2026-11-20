export type Fix = { lat: number; lng: number; /** méter */ accuracy: number };

export type LiveLocation = {
  fix: Fix | null;
  /** idle: még nem kértük; asking: engedélyre vár; on: követi; denied: elutasítva; unavailable: nem elérhető */
  status: 'idle' | 'asking' | 'on' | 'denied' | 'unavailable';
  start: () => void;
};
