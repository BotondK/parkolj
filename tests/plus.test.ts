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
    { id: '1', placeName: 'Váci utca; belváros', zoneId: 'A', pricePerHour: 600, plate: 'ABC123', country: 'H', startedAt: Date.UTC(2026, 10, 3, 9, 5), minutes: 60, cost: 600, plusFee: 39, credit: 100, payLabel: 'Visa •••• 4242', profileLabel: 'Cég Kft.' },
  ]);
  assert.ok(csv.startsWith('﻿Kezdés;Hely;Zóna'));
  const [, row] = csv.split('\r\n');
  assert.equal(row, '2026-11-03 09:05;"Váci utca; belváros";A;H ABC123;60;600;39;100;Visa •••• 4242;Cég Kft.');
});
