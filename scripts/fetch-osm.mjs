// OpenStreetMap adatok letöltése Budapestre (Overpass API): mélygarázsok/parkolóházak, P+R parkolók és elektromos töltők.
// Futtatás: node scripts/fetch-osm.mjs  (vagy GitHub Actions: "OSM adatok letöltése", az eredmény letölthető csatolmány)
// Licenc: © OpenStreetMap közreműködők, ODbL. A kimenet: src/data/osm/*.json
import { mkdirSync, writeFileSync } from 'node:fs';

const ENDPOINTS = ['https://overpass-api.de/api/interpreter', 'https://overpass.private.coffee/api/interpreter'];
const AREA = 'area(id:3600037244)->.bp;'; // Budapest közigazgatási határa (OSM relation 37244)

async function overpass(q) {
  let last;
  for (const url of ENDPOINTS) {
    try {
      const r = await fetch(url, { method: 'POST', body: new URLSearchParams({ data: q }), headers: { 'user-agent': 'parkolj-data-fetch/1.0' } });
      if (!r.ok) throw new Error(`${url} ${r.status}`);
      return (await r.json()).elements;
    } catch (e) {
      last = e;
      console.warn(String(e));
    }
  }
  throw last;
}

const pos = (e) => (e.type === 'node' ? { lat: e.lat, lng: e.lon } : e.center ? { lat: e.center.lat, lng: e.center.lon } : null);
const r5 = (n) => Math.round(n * 1e5) / 1e5;
const int = (v) => (v && /^\d+$/.test(v) ? Number(v) : null);
const open = (e) => !/^(private|no|customers;private)$/.test(e.tags.access ?? '');

// 1) Mélygarázsok, parkolóházak
const gEls = await overpass(`[out:json][timeout:180];${AREA}
nwr["amenity"="parking"]["parking"~"^(underground|multi-storey)$"](area.bp);
out center tags;`);
const garages = gEls
  .filter(open)
  .map((e) => {
    const p = pos(e);
    const t = e.tags;
    return p && {
      id: `${e.type[0]}${e.id}`,
      name: t.name ?? null,
      kind: t.parking === 'underground' ? 'underground' : 'multi-storey',
      lat: r5(p.lat),
      lng: r5(p.lng),
      capacity: int(t.capacity),
      fee: t.fee ?? null,
      access: t.access ?? null,
      operator: t.operator ?? null,
      hours: t.opening_hours ?? null,
    };
  })
  .filter(Boolean)
  .sort((a, b) => a.id.localeCompare(b.id));

// 2) Elektromos töltők
const cEls = await overpass(`[out:json][timeout:180];${AREA}
nwr["amenity"="charging_station"](area.bp);
out center tags;`);
const SOCKETS = { type2: 'Type 2', type2_combo: 'CCS', chademo: 'CHAdeMO', tesla_supercharger: 'Tesla', type2_cable: 'Type 2', schuko: 'Schuko' };
const kw = (s) => {
  const m = /([\d.]+)\s*(kW|W)?/i.exec(s ?? '');
  if (!m) return null;
  const v = Number(m[1]);
  return m[2] && m[2] === 'W' ? v / 1000 : v > 1000 ? v / 1000 : v;
};
const chargers = cEls
  .filter(open)
  .map((e) => {
    const p = pos(e);
    const t = e.tags;
    const sockets = [...new Set(Object.entries(SOCKETS).filter(([k]) => t[`socket:${k}`] && t[`socket:${k}`] !== 'no').map(([, v]) => v))];
    const powers = Object.keys(t)
      .filter((k) => /^socket:.*:output$/.test(k) || k === 'charging_station:output')
      .map((k) => kw(t[k]))
      .filter((x) => x);
    return p && {
      id: `${e.type[0]}${e.id}`,
      name: t.name ?? null,
      operator: t.operator ?? t.network ?? t.brand ?? null,
      lat: r5(p.lat),
      lng: r5(p.lng),
      sockets,
      maxKw: powers.length ? Math.max(...powers) : null,
      capacity: int(t.capacity),
      fee: t.fee ?? null,
    };
  })
  .filter(Boolean)
  .sort((a, b) => a.id.localeCompare(b.id));

// 2b) P+R parkolók (park_ride), a BKK P+R-ek többsége díjmentes, BKK-bérlettel vagy jeggyel
const prEls = await overpass(`[out:json][timeout:180];${AREA}
nwr["amenity"="parking"]["park_ride"]["park_ride"!="no"](area.bp);
out center tags;`);
const parkRides = prEls
  .filter(open)
  .map((e) => {
    const p = pos(e);
    const t = e.tags;
    return p && {
      id: `${e.type[0]}${e.id}`,
      name: t.name ?? null,
      lat: r5(p.lat),
      lng: r5(p.lng),
      capacity: int(t.capacity),
      fee: t.fee ?? null,
      transit: t.park_ride === 'yes' ? null : t.park_ride,
      operator: t.operator ?? null,
      hours: t.opening_hours ?? null,
    };
  })
  .filter(Boolean)
  .sort((a, b) => a.id.localeCompare(b.id));

mkdirSync('src/data/osm', { recursive: true });
mkdirSync('public/data', { recursive: true });
const meta = { source: '© OpenStreetMap közreműködők (ODbL)', fetchedAt: new Date().toISOString().slice(0, 10) };
writeFileSync('src/data/osm/garages.json', JSON.stringify({ ...meta, items: garages }) + '\n');
writeFileSync('src/data/osm/chargers.json', JSON.stringify({ ...meta, items: chargers }) + '\n');
writeFileSync('src/data/osm/parkrides.json', JSON.stringify({ ...meta, items: parkRides }) + '\n');
console.log(`Garázsok: ${garages.length} (névvel: ${garages.filter((g) => g.name).length}), töltők: ${chargers.length}, P+R: ${parkRides.length} (névvel: ${parkRides.filter((g) => g.name).length})`);

// 3) Utcaszintű parkolási zónák: az OSM-ben az utcák oldalanként jelölve (parking:left|right|both:zone = A–D,
//    díjfizetési idő: parking:*:fee:conditional). Ebből rajzoljuk a pontos zónákat és határozzuk meg a zónát egy ponton.
const zEls = await overpass(`[out:json][timeout:300];${AREA}
way["highway"][~"^parking:(left|right|both):zone$"~"^[A-D]$"](area.bp);
out tags geom;`);
const HOURS = /yes @ \(([^)]*)\)/;
const streets = [];
for (const e of zEls) {
  const t = e.tags;
  const zone = t['parking:both:zone'] ?? t['parking:right:zone'] ?? t['parking:left:zone'];
  if (!/^[A-D]$/.test(zone ?? '') || !e.geometry) continue;
  const fee = t['parking:both:fee:conditional'] ?? t['parking:right:fee:conditional'] ?? t['parking:left:fee:conditional'] ?? '';
  streets.push({
    z: zone,
    n: t.name ?? null,
    h: HOURS.exec(fee)?.[1] ?? null,
    c: e.geometry.map((g) => [r5(g.lon), r5(g.lat)]),
  });
}
writeFileSync('public/data/zone-streets.json', JSON.stringify({ ...meta, items: streets }) + '\n');
const byZone = streets.reduce((a, s) => ((a[s.z] = (a[s.z] ?? 0) + 1), a), {});
console.log(`Zónás utcaszakaszok: ${streets.length}`, byZone);
const hours = streets.reduce((a, s) => ((a[`${s.z} ${s.h}`] = (a[`${s.z} ${s.h}`] ?? 0) + 1), a), {});
console.log('Díjidők zónánként:', hours);

// 4) Felmérés: van-e az OSM-ben parkolási zóna adat Budapestre (csak naplóz)
if (process.env.PROBE_ZONES) {
  const probes = {
    'utcák parking:*:zone taggel': `way["highway"][~"^parking:.*zone$"~"."](area.bp);`,
    'parkolási zóna területek': `nwr[~"^(boundary|zone|parking_zone)$"~"parking"](area.bp);`,
    'zone:parking taggel': `nwr["zone:parking"](area.bp);`,
  };
  for (const [label, q] of Object.entries(probes)) {
    try {
      const els = await overpass(`[out:json][timeout:180];${AREA}${q}out tags 20;`);
      console.log(`\n## ${label}: ${els.length} (max 20)`);
      for (const e of els) console.log(JSON.stringify({ id: `${e.type}/${e.id}`, tags: e.tags }));
    } catch (e) {
      console.log(`${label}: hiba ${e}`);
    }
  }
}
