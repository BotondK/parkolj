import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildReport, enqueueReport } from '../src/logic/reportCore';
import { prSuggestion } from '../src/logic/parkRide';
import { rememberPlace, topFrequent } from '../src/logic/frequent';
import { zoneById } from '../src/data/zones';
import { historyCsv, shouldAutoExtend } from '../src/types';

test('Plusz: automatikus hosszabbítás csak a lejárat előtti 2 percben, a kereten és a zóna maximumán belül', () => {
  const s = { durationMin: 60, elapsedSec: 60 * 60 - 90 };
  assert.ok(shouldAutoExtend(s, 60, 180));
  assert.ok(!shouldAutoExtend({ ...s, elapsedSec: 60 * 60 - 300 }, 60, 180), 'még korai');
  assert.ok(!shouldAutoExtend({ ...s, elapsedSec: 60 * 60 }, 60, 180), 'már lejárt');
  assert.ok(!shouldAutoExtend({ ...s, autoExtMin: 60 }, 60, 180), 'elfogyott a keret');
  assert.ok(shouldAutoExtend({ ...s, autoExtMin: 45 }, 60, 180));
  assert.ok(!shouldAutoExtend({ ...s, durationMin: 180, elapsedSec: 180 * 60 - 60 }, 120, 180), 'zóna maximuma');
  assert.ok(shouldAutoExtend({ ...s, durationMin: 180, elapsedSec: 180 * 60 - 60 }, 120, null), 'garázsnál nincs maximum');
});

test('Plusz: CSV kimutatás pontosvesszővel, idézőjelezéssel', () => {
  const csv = historyCsv([
    { id: '1', placeName: 'Váci utca; belváros', zoneId: 'A', pricePerHour: 600, plate: 'ABC123', country: 'H', startedAt: new Date(2026, 10, 3, 9, 5).getTime(), minutes: 60, cost: 600, plusFee: 39, credit: 100, payLabel: 'Visa •••• 4242', profileLabel: 'Cég Kft.' },
  ]);
  assert.ok(csv.startsWith('﻿Kezdés;Hely;Zóna'));
  const [, row] = csv.split('\r\n');
  assert.equal(row, '2026-11-03 09:05;"Váci utca; belváros";A;H ABC123;60;600;39;100;Visa •••• 4242;Cég Kft.');
});

test('Városnak: mintaadat, hőtérkép, zónaösszesítő, CSV', async () => {
  const { sampleCityRows, heat, byZone, cityCsv } = await import('../src/logic/city');
  const rows = sampleCityRows();
  assert.ok(rows.every((r) => r.sessions >= 5 && r.users >= 3), 'a mintában is csak anonim csoportok');
  const h = heat(rows, 'weekday');
  assert.ok(h.m.A[19] > h.m.A[7], 'esti csúcs');
  assert.equal(h.max, Math.max(...Object.values(h.m).flatMap((x) => Object.values(x))));
  const z = byZone(rows, 'all');
  assert.equal(z.length, 4);
  assert.ok(z[0].sessions > z[3].sessions);
  const csv = cityCsv([{ zone_id: 'A', dow: 2, hour: 18, sessions: 6, users: 3, avg_minutes: 45, total_ft: 3600 }]);
  assert.equal(csv.split('\r\n')[1], 'A;2;18;6;3;45;3600');
});

test('statisztika: csak rövid kategóriaértékek, a sor legfeljebb 200 elem', async () => {
  const { cleanProps, enqueue } = await import('../src/logic/analyticsCore');
  assert.deepEqual(cleanProps({ zone: 'A', minutes: 60, plus: true, plate: 'ABC-123 nagyon hosszú szabad szöveg ide', obj: { x: 1 } }), { zone: 'A', minutes: 60, plus: true });
  let q: Parameters<typeof enqueue>[0] = [];
  for (let i = 0; i < 250; i++) q = enqueue(q, { sid: 's', name: 'app_open', at: String(i), lang: 'hu', platform: 'web', props: {} });
  assert.equal(q.length, 200);
  assert.equal(q[0].at, '50');
});

test('béta jelentkezés: e-mail ellenőrzés, kötelező mezők, kisbetűs cím', async () => {
  const { betaError, betaRow, validEmail } = await import('../src/logic/betaCore');
  assert.ok(validEmail(' Anna@Pelda.HU '));
  assert.ok(!validEmail('anna@pelda'));
  assert.ok(!validEmail('anna pelda@x.hu'));
  const f = { email: 'Anna@Pelda.hu', platform: null, freq: null, who: null, consent: false } as const;
  assert.equal(betaError({ ...f, email: 'x' }), 'email');
  assert.equal(betaError(f), 'platform');
  assert.equal(betaError({ ...f, platform: 'ios' }), 'freq');
  assert.equal(betaError({ ...f, platform: 'ios', freq: 'weekly' }), 'who');
  const full = { ...f, platform: 'ios', freq: 'weekly', who: 'visitor', consent: false } as const;
  assert.equal(betaError(full), 'consent');
  assert.throws(() => betaRow(full, 'hu'));
  assert.deepEqual(betaRow({ ...full, consent: true }, 'de'), { p_email: 'anna@pelda.hu', p_platform: 'ios', p_freq: 'weekly', p_who: 'visitor', p_lang: 'de' });
});

test('widget: pillanatkép, állapotok, mélylinkek', async () => {
  const { buildWidgetData, widgetState, leftText, progress, parseWidgetUrl, widgetUrl, clockText } = await import('../src/widgets/widgetModel');
  const now = Date.UTC(2026, 10, 23, 12, 0);
  const zone = { id: 'A', color: '#F15B22', maxMinutes: 180 };
  const session = { option: { kind: 'street', zone }, placeName: 'Operaház', plate: 'ABC-123', durationMin: 120, elapsedSec: 30 * 60 };
  const d = buildWidgetData({ lang: 'hu', session, favorites: [{ slot: 'home', name: 'Otthon utca 1.' }], now });
  assert.equal(d.active!.endsAt - now, 90 * 60000);
  assert.equal(d.active!.startedAt, now - 30 * 60000);
  assert.equal(d.active!.canExtend, true);
  assert.equal(d.home, 'Otthon utca 1.');
  assert.equal(d.work, null);
  assert.equal(widgetState(d, now), 'active');
  assert.equal(leftText(d, now), '1:30');
  assert.equal(progress(d, now), 0.25);
  assert.equal(widgetState(d, now + 81 * 60000), 'soon');
  assert.equal(widgetState(d, now + 91 * 60000), 'expired');
  assert.equal(clockText(d.active!.endsAt, 'hu'), '14:30');
  assert.equal(buildWidgetData({ lang: 'hu', session: { ...session, durationMin: 175 }, favorites: [], now }).active!.canExtend, false, '3 órás szabály');
  const idle = buildWidgetData({ lang: 'de', session: null, favorites: [], now });
  assert.equal(widgetState(idle, now), 'idle');
  assert.equal(idle.labels.extend, '+15 Min.');
  assert.equal(parseWidgetUrl(widgetUrl('extend')), 'extend');
  assert.equal(parseWidgetUrl('parkolj:///widget/stop?x=1'), 'stop');
  assert.equal(parseWidgetUrl('parkolj://widget/torol'), null);
  assert.equal(parseWidgetUrl('https://example.com/widget/stop'), null);
  assert.equal(parseWidgetUrl(null), null);
});

test('élő tevékenység: az app és a widget ugyanazt az adattípust használja (iOS csak így köti össze)', async () => {
  const { readFileSync } = await import('node:fs');
  const a = readFileSync(new URL('../modules/parkolj-live/ios/ParkingActivityAttributes.swift', import.meta.url), 'utf8');
  const b = readFileSync(new URL('../targets/widget/ParkingActivityAttributes.swift', import.meta.url), 'utf8');
  assert.equal(a, b);
  // A pillanatkép minden mezőt tartalmaz, amit a natív oldal vár (LiveController.Payload)
  const { buildWidgetData } = await import('../src/widgets/widgetModel');
  const d = buildWidgetData({ lang: 'hu', session: { option: { kind: 'street', zone: { id: 'A', color: '#F15B22', maxMinutes: 180 } }, placeName: 'X', plate: 'ABC-123', durationMin: 60, elapsedSec: 0 }, favorites: [], now: 0 });
  const payload = { ...d.active!, labels: d.labels };
  for (const k of ['zone', 'color', 'plate', 'place', 'startedAt', 'endsAt', 'canExtend']) assert.ok(k in payload, k);
  for (const k of ['zone', 'expires', 'expired', 'extend', 'stop']) assert.ok(k in payload.labels, k);
});

test('jelzés: ~100 m-re kerekített hely, zóna ellenőrzés, Budapesten kívül nem küld', () => {
  const r = buildReport({ kind: 'nospace', coord: { lat: 47.497912, lng: 19.040235 }, zone: 'A', district: 'V. kerület', optionKind: 'fastest', lang: 'hu', now: new Date('2026-11-24T10:00:00Z') })!;
  assert.equal(r.lat, 47.498);
  assert.equal(r.lng, 19.04);
  assert.equal(r.zone_id, 'A');
  assert.equal(r.note, null);
  assert.equal(r.at, '2026-11-24T10:00:00.000Z');
  assert.equal(buildReport({ kind: 'other', coord: { lat: 48.2, lng: 16.37 }, zone: null, lang: 'en' }), null);
  const long = buildReport({ kind: 'wrongprice', coord: { lat: 47.5, lng: 19.05 }, zone: 'X', note: '  ' + 'x'.repeat(400), lang: 'de' })!;
  assert.equal(long.zone_id, null);
  assert.equal(long.note!.length, 300);
  let q: ReturnType<typeof enqueueReport> = [];
  for (let i = 0; i < 60; i++) q = enqueueReport(q, r);
  assert.equal(q.length, 50);
});

test('P+R javaslat: belvárosi célnál a zónán kívüli, útba eső P+R; D zónában és ingyenes helyen nincs', () => {
  const A = zoneById('A')!;
  const D = zoneById('D')!;
  const opera = { lat: 47.5026, lng: 19.0581 };
  const list = [
    { id: 'n1', name: 'Örs vezér tere P+R', lat: 47.5035, lng: 19.1365, capacity: 400, fee: 'no', transit: null, operator: null, hours: null },
    { id: 'n2', name: 'Kelenföld P+R', lat: 47.4636, lng: 19.0213, capacity: 600, fee: null, transit: 'train', operator: null, hours: null },
    { id: 'n3', name: 'Fizetős P+R', lat: 47.53, lng: 19.12, capacity: 50, fee: 'yes', transit: null, operator: null, hours: null },
    { id: 'n4', name: null, lat: 47.52, lng: 19.13, capacity: 50, fee: 'no', transit: null, operator: null, hours: null },
  ];
  assert.equal(prSuggestion(opera, D, null, list), null);
  assert.equal(prSuggestion(opera, null, null, list), null);
  const fromEast = prSuggestion(opera, A, { lat: 47.52, lng: 19.3 }, list)!;
  assert.equal(fromEast.pr.id, 'n1');
  const fromSouthWest = prSuggestion(opera, A, { lat: 47.38, lng: 18.92 }, list)!;
  assert.equal(fromSouthWest.pr.id, 'n2');
  assert.ok(fromEast.transitMin > 10 && fromEast.transitMin < 40);
});

test('gyakori helyek: gyakoriság és frissesség szerint, azonos hely egyszer', () => {
  const p = (id: string, lat: number) => ({ id, name: id, address: '', kind: 'address' as const, lat, lng: 19.05 });
  let l = rememberPlace([], p('opera', 47.5), 1000);
  l = rememberPlace(l, p('mupa', 47.47), 2000);
  l = rememberPlace(l, p('opera-photon', 47.50001), 3000); // ugyanaz a hely, másik azonosító
  assert.equal(l.length, 2);
  assert.deepEqual(topFrequent(l, 5, 4000).map((x) => x.id), ['opera-photon', 'mupa']);
});
