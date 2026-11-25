import { GARAGES, type Garage } from '../data/garages';
import type { LatLng, Zone } from '../data/zones';
import { distanceM, offset, walkMinutes, zoneAt } from './geo';
import { formatClock, paidEnd, priceFor, priceWindow } from './pricing';
import { bpParts } from './budapestTime';
import { streetPointsNear } from './zoneStreets';
import { hotspotPenalty, searchEstimate, searchMinutesFor } from './reportCore';
import { ZONES } from '../data/zones';

export type OptionKind = 'fastest' | 'cheapest' | 'garage' | 'here';

export type ParkingOption = {
  id: string;
  kind: OptionKind;
  coord: LatLng;
  zone: Zone | null;
  garage?: Garage;
  walkMin: number;
  /** 0..1: becsült esély, hogy érkezéskor van szabad hely */
  availability: number;
  /** Becsült díj a tervezett időtartamra */
  cost: number;
  /** Max. engedélyezett idő percben (3 órás szabály), null = korlátlan */
  maxMinutes: number | null;
  /** Ha a parkolás alatt véget ér a díjfizetés: ettől ingyenes (pl. „20:00”) */
  freeFrom?: string;
  /** Égtáj kulcs a leíráshoz (N, NE, ...) */
  bearing: string;
  distanceM: number;
  /** Az utca neve, ha ismert (OSM) */
  street?: string | null;
  /** Becsült idő a célig percben: helykeresés + gyaloglás (garázsnál behajtás + gyaloglás) */
  etaMin: number;
  /** Mások ebben az idősávban többször jelezték, hogy itt nem volt hely */
  reportedFull?: boolean;
  /** A javaslatok közül ez ér leghamarabb a célhoz */
  quickest?: boolean;
  /** Az „olcsóbb” helyett: nincs olcsóbb utcai hely, ez a nagyobb eséllyel szabad */
  surer?: boolean;
};

const BEARINGS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];

/** Determinisztikus ál-véletlen 0..1 (hogy a demó minden futáskor ugyanazt mutassa egy adott órában). */
function noise(a: number, b: number, c: number) {
  const x = Math.sin(a * 12.9898 + b * 78.233 + c * 37.719) * 43758.5453;
  return x - Math.floor(x);
}

/** Mock foglaltsági modell: a célpont közelében és este (rendezvények) nehezebb helyet találni. */
function availabilityAt(pt: LatLng, distFromDest: number, at: Date): number {
  const { hour: h, weekday } = bpParts(at);
  const eventPeak = h >= 17 && h <= 21 ? 0.18 : 0;
  const officePeak = h >= 9 && h <= 16 && weekday >= 1 && weekday <= 5 ? 0.12 : 0;
  const base = 0.2 + Math.min(distFromDest, 1200) / 1500 - eventPeak - officePeak;
  const n = (noise(pt.lat * 1000, pt.lng * 1000, h) - 0.5) * 0.35;
  // Valódi jelzés: ahol mások ebben az idősávban többször nem találtak helyet, ott kisebb az esély
  return Math.max(0.05, Math.min(0.95, base + n - hotspotPenalty(pt, h)));
}

function streetCost(zone: Zone | null, minutes: number, at: Date) {
  if (!zone) return 0;
  const capped = zone.maxMinutes ? Math.min(minutes, zone.maxMinutes) : minutes;
  return priceWindow(zone, at, capped);
}

/** Ha a parkolás közben véget ér a díjfizetés, annak időpontja (pl. „20:00”). */
function freeFromLabel(zone: Zone | null, minutes: number, at: Date): string | undefined {
  if (!zone) return undefined;
  const end = paidEnd(zone, at);
  if (end && end.getTime() < at.getTime() + minutes * 60000) return formatClock(end);
  return undefined;
}

export function recommend(dest: LatLng, plannedMinutes: number, at: Date = new Date()): ParkingOption[] {
  // 1) Jelölt utcai helyek: ha betöltött az utcaszintű zónaadat, a cél körüli valódi zónás utcákon;
  //    különben gyűrűkben, de csak zónán belüli pontokon (ne kerüljön pályaudvarra, parkba)
  const candidates: ParkingOption[] = [];
  const bearingOf = (coord: LatLng) => {
    const deg = ((Math.atan2(coord.lng - dest.lng, (coord.lat - dest.lat) / Math.cos((dest.lat * Math.PI) / 180)) * 180) / Math.PI + 360) % 360;
    return BEARINGS[Math.round(deg / 45) % 8];
  };
  const add = (id: string, coord: LatLng, zone: Zone | null, street: string | null) => {
    const d = distanceM(dest, coord);
    const walkMin = walkMinutes(dest, coord);
    const availability = availabilityAt(coord, d, at);
    candidates.push({
      id,
      kind: 'fastest',
      coord,
      zone,
      walkMin,
      availability,
      cost: streetCost(zone, plannedMinutes, at),
      freeFrom: freeFromLabel(zone, plannedMinutes, at),
      maxMinutes: zone?.maxMinutes ?? null,
      bearing: bearingOf(coord),
      distanceM: Math.round(d / 10) * 10,
      street,
      etaMin: Math.round(walkMin + searchEstimate(availability, searchMinutesFor(zone?.id, bpParts(at).hour))),
      reportedFull: hotspotPenalty(coord, bpParts(at).hour) > 0,
    });
  };
  const pts = streetPointsNear(dest, 1200).filter((p) => distanceM(dest, p.coord) <= 1200);
  if (pts.length >= 6) {
    pts.forEach((p, i) => add(`st-${i}-${p.coord.lat.toFixed(4)}`, p.coord, ZONES.find((z) => z.id === p.z) ?? null, p.n));
  } else {
    const destInZone = !!zoneAt(dest);
    const rings = [110, 220, 350, 500, 700, 950, 1200];
    rings.forEach((r, ri) => {
      BEARINGS.forEach((_, bi) => {
        const angle = (bi * Math.PI) / 4 + ri * 0.35;
        const coord = offset(dest, Math.cos(angle) * r, Math.sin(angle) * r);
        const zone = zoneAt(coord);
        if (destInZone && !zone) return;
        add(`s-${ri}-${bi}`, coord, zone, null);
      });
    });
    if (!candidates.length) add('s-dest', dest, zoneAt(dest), null);
  }

  // Várható „idő a célig”: gyaloglás + keresgélés (alacsony esély = körözés)
  const timeScore = (o: ParkingOption) => o.etaMin + o.walkMin * 0.01;

  const fastest = [...candidates].filter((c) => c.availability >= 0.4).sort((a, b) => timeScore(a) - timeScore(b))[0] ??
    [...candidates].sort((a, b) => timeScore(a) - timeScore(b))[0];

  const others = candidates.filter((c) => c.id !== fastest.id && c.availability >= 0.45 && c.walkMin <= 18);
  const cheaper = others
    .filter((c) => c.cost < fastest.cost)
    .sort((a, b) => a.cost - b.cost || timeScore(a) - timeScore(b))[0];
  const surest = others.sort((a, b) => b.availability - a.availability || a.walkMin - b.walkMin)[0];
  const cheapest = { ...(cheaper ?? surest ?? fastest), kind: 'cheapest' as const, surer: !cheaper };

  // 2) Legközelebbi garázs
  const g = [...GARAGES].sort((a, b) => distanceM(dest, a) - distanceM(dest, b))[0];
  const gFree = Math.round(g.capacity * (0.08 + noise(g.lat, g.lng, bpParts(at).hour) * 0.3));
  const garage: ParkingOption = {
    id: g.id,
    kind: 'garage',
    coord: { lat: g.lat, lng: g.lng },
    zone: null,
    garage: { ...g, capacity: gFree },
    walkMin: walkMinutes(dest, g),
    availability: 0.97,
    cost: priceFor(g, plannedMinutes),
    maxMinutes: null,
    bearing: '',
    distanceM: Math.round(distanceM(dest, g) / 10) * 10,
    // behajtás, sorompó, lift: kb. 2 perc
    etaMin: walkMinutes(dest, g) + 2,
  };

  const out: ParkingOption[] = [{ ...fastest, kind: 'fastest' }, cheapest, garage];
  const best = Math.min(...out.map((o) => o.etaMin));
  return out.map((o) => ({ ...o, quickest: o.etaMin === best && out.findIndex((x) => x.etaMin === best) === out.indexOf(o) }));
}

/** „Parkolás itt”: a felhasználó által választott pont (térkép-koppintás vagy saját helyzet). */
export function hereOption(pt: LatLng, plannedMinutes: number, at: Date = new Date()): ParkingOption {
  const zone = zoneAt(pt);
  return {
    id: `here-${pt.lat.toFixed(5)}-${pt.lng.toFixed(5)}`,
    kind: 'here',
    coord: pt,
    zone,
    walkMin: 0,
    availability: 1,
    cost: streetCost(zone, plannedMinutes, at),
    freeFrom: freeFromLabel(zone, plannedMinutes, at),
    maxMinutes: zone?.maxMinutes ?? null,
    bearing: '',
    distanceM: 0,
    etaMin: 0,
  };
}
