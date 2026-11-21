import { OSM_GARAGES } from './poi';
import type { LatLng } from './zones';

export type Garage = LatLng & {
  id: string;
  name: string;
  /** Becsült óradíj (Ft); 0 = ingyenes. A valódi árlista partnerszerződéssel jön. */
  pricePerHour: number;
  capacity: number;
  /** Valódi férőhelyszám az OpenStreetMapből, ha ismert */
  realCapacity: number | null;
  operator: string | null;
  hours: string | null;
  /** Csak vásárlóknak (pl. bevásárlóközpont) */
  customersOnly: boolean;
  /** Foglalható partneren át (most: a Parkl üzemelteti az OSM szerint) */
  bookable: boolean;
};

// Ismert belvárosi garázsok (valódi helyek), ha az OSM-ben név nélkül vagy hiányosan szerepelnek.
const KNOWN: Omit<Garage, 'pricePerHour' | 'realCapacity' | 'operator' | 'hours' | 'customersOnly' | 'bookable'>[] = [
  { id: 'g-szabadsag', name: 'Szabadság tér mélygarázs', capacity: 520, lat: 47.5022, lng: 19.0505 },
  { id: 'g-erzsebet', name: 'Erzsébet tér mélygarázs', capacity: 300, lat: 47.4983, lng: 19.0538 },
  { id: 'g-szervita', name: 'Szervita tér garázs', capacity: 380, lat: 47.4952, lng: 19.0532 },
  { id: 'g-corvin', name: 'Corvin Plaza parkolóház', capacity: 900, lat: 47.4862, lng: 19.0755 },
  { id: 'g-mupa', name: 'Müpa mélygarázs', capacity: 600, lat: 47.4693, lng: 19.0721 },
  { id: 'g-westend', name: 'WestEnd parkolóház', capacity: 1600, lat: 47.5136, lng: 19.0592 },
  { id: 'g-allee', name: 'Allee parkolóház', capacity: 1100, lat: 47.4747, lng: 19.0505 },
  { id: 'g-mammut', name: 'Mammut parkolóház', capacity: 1000, lat: 47.5081, lng: 19.0268 },
  { id: 'g-arena', name: 'Puskás Aréna P+R', capacity: 1300, lat: 47.5005, lng: 19.0935 },
  { id: 'g-madach', name: 'Madách parkolóház', capacity: 450, lat: 47.4985, lng: 19.0608 },
];

const near = (a: LatLng, b: LatLng) => Math.hypot((a.lat - b.lat) * 111_000, (a.lng - b.lng) * 75_000) < 180;

/** Becsült garázs-óradíj a környék szerint (belváros drágább). Jelölve „kb.”-ként jelenik meg. */
export function estimateGaragePrice(p: LatLng, fee: string | null = 'yes') {
  if (fee === 'no') return 0;
  const d = Math.hypot((p.lat - 47.4979) * 111_000, (p.lng - 19.0532) * 75_000);
  return d < 1200 ? 800 : d < 2500 ? 650 : d < 5000 ? 500 : 400;
}

/** Az ajánláshoz használt garázsok: a nyilvános, névvel rendelkező OSM-garázsok + az ismert belvárosiak (duplikáció nélkül) */
export const GARAGES: Garage[] = (() => {
  const osm: Garage[] = OSM_GARAGES.filter((g) => g.name && g.access !== 'private' && g.access !== 'no').map((g) => ({
    id: g.id,
    name: g.name!,
    lat: g.lat,
    lng: g.lng,
    pricePerHour: estimateGaragePrice(g, g.fee),
    capacity: g.capacity ?? 200,
    realCapacity: g.capacity,
    operator: g.operator,
    hours: g.hours,
    customersOnly: g.access === 'customers',
    bookable: /parkl/i.test(g.operator ?? ''),
  }));
  const extra = KNOWN.filter((k) => !osm.some((o) => near(o, k))).map((k) => ({
    ...k,
    pricePerHour: estimateGaragePrice(k),
    realCapacity: null,
    operator: null,
    hours: null,
    customersOnly: false,
    bookable: false,
  }));
  return [...osm, ...extra];
})();
