import assert from 'node:assert/strict';
import { test } from 'node:test';
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
