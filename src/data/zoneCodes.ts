import type { ZoneId } from './zones';

// Budapesti várakozási övezetek 4 jegyű kódjai zónatípus szerint, kerülettel.
// Forrás: BKK, „Várakozási övezetek, parkolási zónák Budapesten” (https://bkk.hu/downloads/43733/), 2026. július.
// A kód a helyszíni táblán szerepel, SMS-es és telefonos fizetésnél ezt kell megadni.
export const ZONE_CODES: Record<ZoneId, [code: string, district: string][]> = {
  A: [
    ['3011', 'I'], ['3016', 'I'], ['0201', 'II'], ['0205', 'II'], ['0501', 'V'], ['0601', 'VI'], ['3061', 'VI'],
    ['0701', 'VII'], ['3071', 'VII'], ['3072', 'VII'], ['3081', 'VIII'], ['3082', 'VIII'], ['3083', 'VIII'],
    ['3088', 'VIII'], ['0901', 'IX'], ['0902', 'IX'], ['0904', 'IX'], ['3123', 'XII'], ['0131', 'XIII'], ['0133', 'XIII'],
  ],
  B: [
    ['3012', 'I'], ['3017', 'I'], ['0202', 'II'], ['0206', 'II'], ['0301', 'III'], ['0303', 'III'], ['0602', 'VI'],
    ['3062', 'VI'], ['0702', 'VII'], ['3073', 'VII'], ['3084', 'VIII'], ['3085', 'VIII'], ['3086', 'VIII'],
    ['3089', 'VIII'], ['0903', 'IX'], ['0906', 'IX'], ['1101', 'XI'], ['3111', 'XI'], ['3113', 'XI'], ['3121', 'XII'],
    ['0138', 'XIII'], ['0139', 'XIII'], ['1142', 'XIV'], ['1143', 'XIV'], ['1144', 'XIV'], ['1146', 'XIV'], ['1148', 'XIV'],
  ],
  C: [
    ['0203', 'II'], ['0207', 'II'], ['0302', 'III'], ['0304', 'III'], ['3080', 'VIII'], ['3087', 'VIII'], ['0907', 'IX'],
    ['0101', 'X'], ['1102', 'XI'], ['3112', 'XI'], ['3117', 'XI'], ['3118', 'XI'], ['0135', 'XIII'], ['1140', 'XIV'], ['1145', 'XIV'],
  ],
  D: [['0908', 'IX'], ['0102', 'X'], ['1104', 'XI'], ['3114', 'XI'], ['3115', 'XI'], ['3116', 'XI']],
};

// Munkaszüneti napok (díjmentes parkolás). Áthelyezett munkanapok még nincsenek benne.
export const HOLIDAYS = new Set([
  '2026-01-01', '2026-03-15', '2026-04-03', '2026-04-06', '2026-05-01', '2026-05-25', '2026-08-20', '2026-10-23',
  '2026-11-01', '2026-12-24', '2026-12-25', '2026-12-26',
  '2027-01-01', '2027-03-15', '2027-03-26', '2027-03-29', '2027-05-01', '2027-05-17', '2027-08-20', '2027-10-23',
  '2027-11-01', '2027-12-24', '2027-12-25', '2027-12-26',
]);
