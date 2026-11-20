import { Platform } from 'react-native';
import { useEffect, useState } from 'react';
import { setZoneStreets, type ZoneStreet } from './zoneStreets';

// Az utcaszintű zónaadat külön fájl (public/data/zone-streets.json), hogy ne növelje az app méretét.
// Weben a saját oldalról, telefonon a webes demó címéről tölti le. Hiba esetén marad a közelítő sokszög.
const NATIVE_URL = 'https://botondk.github.io/parkolj/data/zone-streets.json';

export function useZoneStreets(): ZoneStreet[] {
  const [items, setItems] = useState<ZoneStreet[]>([]);
  useEffect(() => {
    const url = Platform.OS === 'web' ? new URL('data/zone-streets.json', document.baseURI).href : NATIVE_URL;
    fetch(url)
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((j: { items?: ZoneStreet[] }) => {
        if (!Array.isArray(j.items) || !j.items.length) return;
        setZoneStreets(j.items);
        setItems(j.items);
      })
      .catch(() => {});
  }, []);
  return items;
}
