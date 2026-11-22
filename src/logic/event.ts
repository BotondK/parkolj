// „Előadás végéig”: színház, koncert, mozi, meccs esetén a parkolási időt az esemény várható végéhez igazítjuk.
// Jellemző hosszak (szünettel, reklámmal); élesben a helyszínek műsorából jöhet a pontos kezdés és vége.
import type { PlaceKind } from '../data/places';

export const EVENT_MINUTES: Partial<Record<PlaceKind, number>> = { theatre: 180, concert: 150, cinema: 150, sport: 135 };
const WALK_IN = 10; // érkezéstől a helyig, ruhatár
const WALK_BACK = 15; // vissza az autóhoz

/** Az érkezés utáni első félórás kezdés; a parkolás az esemény vége + visszasétáig tart, 15 percre felfelé kerekítve */
export function eventStay(kind: PlaceKind, arrive: Date): { start: Date; end: Date; minutes: number } | null {
  const len = EVENT_MINUTES[kind];
  if (!len) return null;
  const t = arrive.getTime() + WALK_IN * 60000;
  const half = 30 * 60000;
  const start = new Date(Math.ceil(t / half) * half);
  const end = new Date(start.getTime() + len * 60000);
  const raw = (end.getTime() + WALK_BACK * 60000 - arrive.getTime()) / 60000;
  return { start, end, minutes: Math.ceil(raw / 15) * 15 };
}
