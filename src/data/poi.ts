// Valódi helyek az OpenStreetMapből (ODbL): mélygarázsok, parkolóházak, elektromos töltők.
// Frissítés: GitHub Actions → „OSM adatok letöltése” → csatolmány → src/data/osm/ (vagy node scripts/fetch-osm.mjs)
import chargersJson from './osm/chargers.json';
import garagesJson from './osm/garages.json';

export type OsmGarage = {
  id: string;
  name: string | null;
  kind: 'underground' | 'multi-storey';
  lat: number;
  lng: number;
  capacity: number | null;
  fee: string | null;
  access: string | null;
  operator: string | null;
  hours: string | null;
};

export type Charger = {
  id: string;
  name: string | null;
  operator: string | null;
  lat: number;
  lng: number;
  sockets: string[];
  maxKw: number | null;
  capacity: number | null;
  fee: string | null;
};

export const OSM_GARAGES = garagesJson.items as OsmGarage[];
export const CHARGERS = chargersJson.items as Charger[];
export const POI_FETCHED_AT = garagesJson.fetchedAt;
