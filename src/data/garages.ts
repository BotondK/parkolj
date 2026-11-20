import type { LatLng } from './zones';

export type Garage = LatLng & {
  id: string;
  name: string;
  pricePerHour: number;
  capacity: number;
  /** Partner foglalás (pl. Parkl) — a prototípusban csak mélylink */
  bookable: boolean;
};

// DEMÓ garázsok, kitalált árakkal és kapacitással.
export const GARAGES: Garage[] = [
  { id: 'g-szabadsag', name: 'Szabadság tér mélygarázs', pricePerHour: 700, capacity: 520, bookable: true, lat: 47.5022, lng: 19.0505 },
  { id: 'g-erzsebet', name: 'Erzsébet tér mélygarázs', pricePerHour: 750, capacity: 300, bookable: true, lat: 47.4983, lng: 19.0538 },
  { id: 'g-szervita', name: 'Szervita tér garázs', pricePerHour: 800, capacity: 380, bookable: false, lat: 47.4952, lng: 19.0532 },
  { id: 'g-corvin', name: 'Corvin Plaza parkolóház', pricePerHour: 450, capacity: 900, bookable: true, lat: 47.4862, lng: 19.0755 },
  { id: 'g-mupa', name: 'Müpa mélygarázs', pricePerHour: 500, capacity: 600, bookable: true, lat: 47.4693, lng: 19.0721 },
  { id: 'g-westend', name: 'WestEnd parkolóház', pricePerHour: 400, capacity: 1600, bookable: false, lat: 47.5136, lng: 19.0592 },
  { id: 'g-allee', name: 'Allee parkolóház', pricePerHour: 350, capacity: 1100, bookable: false, lat: 47.4747, lng: 19.0505 },
  { id: 'g-mammut', name: 'Mammut parkolóház', pricePerHour: 450, capacity: 1000, bookable: false, lat: 47.5081, lng: 19.0268 },
  { id: 'g-arena', name: 'Puskás Aréna P+R', pricePerHour: 300, capacity: 1300, bookable: true, lat: 47.5005, lng: 19.0935 },
  { id: 'g-erkel', name: 'Köztársaság tér parkoló', pricePerHour: 400, capacity: 250, bookable: false, lat: 47.4973, lng: 19.0795 },
  { id: 'g-madach', name: 'Madách parkolóház', pricePerHour: 600, capacity: 450, bookable: true, lat: 47.4985, lng: 19.0608 },
];
