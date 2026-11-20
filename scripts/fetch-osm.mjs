// OpenStreetMap adatok letöltése Budapestre (Overpass API): mélygarázsok/parkolóházak és elektromos töltők.
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

mkdirSync('src/data/osm', { recursive: true });
const meta = { source: '© OpenStreetMap közreműködők (ODbL)', fetchedAt: new Date().toISOString().slice(0, 10) };
writeFileSync('src/data/osm/garages.json', JSON.stringify({ ...meta, items: garages }) + '\n');
writeFileSync('src/data/osm/chargers.json', JSON.stringify({ ...meta, items: chargers }) + '\n');
console.log(`Garázsok: ${garages.length} (névvel: ${garages.filter((g) => g.name).length}), töltők: ${chargers.length}`);

// 3) Felmérés: van-e az OSM-ben parkolási zóna adat Budapestre (csak naplóz)
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
