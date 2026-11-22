import { useEffect, useMemo, useState } from 'react';
import { searchPlaces, type Place } from '../data/places';
import { DISTRICT_CENTERS } from './geo';
import { geocode } from './geocode';

export const DISTRICT_PLACES: Place[] = DISTRICT_CENTERS.map((d) => ({
  id: `district-${d.name}`,
  name: d.name,
  nameEn: `District ${d.name.split('.')[0]}`,
  nameDe: `${d.name.split('.')[0]}. Bezirk`,
  address: 'Budapest',
  kind: 'address',
  lat: d.lat,
  lng: d.lng,
}));

/** Helyi célpontok + valódi címkeresés 3+ karaktertől, 400 ms késleltetéssel; ha nem elérhető, marad a helyi lista */
export function usePlaceSearch(query: string) {
  const [remote, setRemote] = useState<Place[]>([]);
  useEffect(() => {
    setRemote([]);
    if (query.trim().length < 3) return;
    const ctrl = new AbortController();
    const id = setTimeout(() => geocode(query.trim(), ctrl.signal).then(setRemote), 400);
    return () => {
      clearTimeout(id);
      ctrl.abort();
    };
  }, [query]);
  return useMemo(() => {
    const local = searchPlaces(query, DISTRICT_PLACES);
    const far = remote.filter((r) => !local.some((l) => Math.abs(l.lat - r.lat) < 0.0015 && Math.abs(l.lng - r.lng) < 0.0015));
    return [...local, ...far].slice(0, 10);
  }, [query, remote]);
}
