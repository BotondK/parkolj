import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { Strings } from '../i18n';

// Városi közlekedési appok (BudapestGO) letisztult stílusa: fehér/világosszürke panel, mélylila fő szín,
// lekerekített keretes mezők, nagy félkövér címek. Saját név és logó.
export const C = {
  bg: '#F4F4F5',
  card: '#FFFFFF',
  text: '#1C1B1F',
  sub: '#5E5D66',
  line: '#CFCFD4',
  brand: '#4A1466',
  brandSoft: '#F1E9F5',
  warn: '#B45309',
  warnSoft: '#FEF3C7',
  danger: '#B91C1C',
  dangerSoft: '#FEE2E2',
};


export function Row({ k, v, strong }: { k: string; v: string; strong?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 }}>
      <Text style={{ color: C.sub }}>{k}</Text>
      <Text style={{ color: C.text, fontWeight: strong ? '800' : '600' }}>{v}</Text>
    </View>
  );
}

export function Meta({ text, tone }: { text: string; tone?: 'good' | 'mid' | 'bad' }) {
  const bg = tone === 'good' ? '#DCFCE7' : tone === 'mid' ? '#FEF3C7' : tone === 'bad' ? '#FEE2E2' : '#F1F5F9';
  const fg = tone === 'good' ? '#166534' : tone === 'mid' ? '#92400E' : tone === 'bad' ? '#991B1B' : '#475569';
  return (
    <View style={{ backgroundColor: bg, borderRadius: 99, paddingHorizontal: 8, paddingVertical: 3 }}>
      <Text style={{ color: fg, fontSize: 12, fontWeight: '600' }}>{text}</Text>
    </View>
  );
}

export function Chip({ text, active, onPress }: { text: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.chip, active && styles.chipOn]}>
      <Text style={{ color: active ? '#fff' : C.text, fontWeight: '600' }}>{text}</Text>
    </Pressable>
  );
}

export function PrimaryButton({ text, onPress, disabled }: { text: string; onPress: () => void; disabled?: boolean }) {
  return (
    <Pressable onPress={disabled ? undefined : onPress} style={[styles.primary, disabled && { opacity: 0.4 }]}>
      <Text style={styles.primaryText}>{text}</Text>
    </Pressable>
  );
}

export function BackLink({ t, onPress }: { t: Strings; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={{ marginBottom: 6, alignSelf: 'flex-start' }}>
      <Text style={{ color: C.brand, fontWeight: '600' }}>‹ {t.back}</Text>
    </Pressable>
  );
}


export const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: C.card,
    borderBottomWidth: 1,
    borderColor: C.line,
  },
  logo: { width: 34, height: 34, borderRadius: 10, backgroundColor: C.brand, alignItems: 'center', justifyContent: 'center' },
  langSwitch: { flexDirection: 'row', backgroundColor: '#F1F5F9', borderRadius: 99, padding: 3 },
  langBtn: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 99 },
  langBtnOn: { backgroundColor: C.text },
  mapFade: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 12, backgroundColor: 'transparent' },
  h1: { fontSize: 30, fontWeight: '800', color: C.text, letterSpacing: -0.4 },
  sub: { color: C.sub, marginTop: 4, fontSize: 14, lineHeight: 20 },
  label: { marginTop: 20, marginBottom: 8, fontSize: 14, fontWeight: '700', color: C.text },
  search: {
    backgroundColor: C.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E4E4E7',
    paddingHorizontal: 16,
    paddingLeft: 48,
    height: 56,
    fontSize: 17,
    color: C.text,
    shadowColor: '#000',
    shadowOpacity: 0.14,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  searchIcon: { position: 'absolute', left: 16, top: 15, fontSize: 18, color: C.text },
  result: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: C.card,
    borderRadius: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: C.line,
  },
  card: { backgroundColor: C.card, borderRadius: 10, borderWidth: 1, borderColor: C.line, padding: 16 },
  option: { marginBottom: 10 },
  badge: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 6 },
  chip: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10, backgroundColor: C.card, borderWidth: 1, borderColor: C.line },
  chipOn: { backgroundColor: C.brand, borderColor: C.brand },
  primary: { marginTop: 18, backgroundColor: C.brand, borderRadius: 10, paddingVertical: 15, alignItems: 'center' },
  primaryText: { color: '#fff', fontWeight: '700', fontSize: 17 },
  secondary: { flex: 1, borderWidth: 1, borderColor: C.brand, borderRadius: 10, paddingVertical: 14, alignItems: 'center', backgroundColor: C.card },
  secondaryText: { color: C.brand, fontWeight: '700', fontSize: 16 },
  navBtn: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 15,
  },
  navBtnText: { fontWeight: '700', fontSize: 15, color: C.text },
  zonePill: { alignSelf: 'flex-start', borderRadius: 99, paddingHorizontal: 12, paddingVertical: 6, marginTop: 10 },
  stepper: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.card, borderRadius: 10, borderWidth: 1, borderColor: C.line, padding: 10 },
  stepBtn: { width: 48, height: 48, borderRadius: 10, backgroundColor: C.brandSoft, alignItems: 'center', justifyContent: 'center' },
  stepBtnText: { fontSize: 26, fontWeight: '700', color: C.text },
  progress: { width: '100%', height: 8, backgroundColor: '#F1F5F9', borderRadius: 99, marginTop: 16, overflow: 'hidden' },
  banner: { borderRadius: 10, padding: 12, marginBottom: 12 },
  demoRow: { flexDirection: 'row', alignItems: 'center', marginTop: 18, paddingTop: 12, borderTopWidth: 1, borderColor: C.line },
  countryChip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10, backgroundColor: '#F1F5F9' },
  euBand: { width: 34, borderRadius: 8, backgroundColor: '#1D4ED8', alignItems: 'center', justifyContent: 'center' },
  tabBar: { flexDirection: 'row', backgroundColor: C.card, borderTopWidth: 1, borderBottomWidth: 1, borderColor: C.line, paddingHorizontal: 8, paddingVertical: 6, gap: 4 },
  tabBtn: { flex: 1, alignItems: 'center', paddingVertical: 9, borderRadius: 10 },
  tabBtnOn: { backgroundColor: C.brandSoft },
  demoNote: { marginTop: 24, color: '#8E8D96', fontSize: 12, textAlign: 'center' },
  // Asztali elrendezés: bal oldali panel
  sideTop: { backgroundColor: C.card, paddingHorizontal: 28, paddingTop: 28, paddingBottom: 20 },
  sideTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 24 },
  sideTitle: { fontSize: 38, fontWeight: '800', color: C.text, letterSpacing: -0.6 },
  closeX: { fontSize: 30, color: C.text, paddingHorizontal: 6, lineHeight: 32 },
  brandCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: C.card, borderRadius: 14,
    marginHorizontal: 28, marginBottom: 24, marginTop: 8, paddingHorizontal: 18, paddingVertical: 14,
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 6, shadowOffset: { width: 0, height: 1 },
  },
  brandMark: { width: 36, height: 36, borderRadius: 18, borderWidth: 5, borderColor: C.brand, alignItems: 'center', justifyContent: 'center' },
  // Térkép fölötti elemek
  pill: {
    flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: C.card, borderRadius: 30, height: 56, paddingLeft: 20, paddingRight: 16,
    shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 4,
  },
  roundBtn: {
    width: 56, height: 56, borderRadius: 28, backgroundColor: C.card, alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 4,
  },
  menu: {
    position: 'absolute', top: 64, right: 0, width: 240, backgroundColor: C.card, borderRadius: 14, paddingVertical: 8,
    shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 6,
  },
  menuItem: { paddingHorizontal: 18, paddingVertical: 12, flexDirection: 'row', justifyContent: 'space-between' },
  sheet: {
    position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: C.bg, borderTopLeftRadius: 18, borderTopRightRadius: 18, overflow: 'hidden',
    shadowColor: '#000', shadowOpacity: 0.16, shadowRadius: 12, shadowOffset: { width: 0, height: -2 }, elevation: 8,
  },
  grabber: { alignSelf: 'center', width: 40, height: 5, borderRadius: 3, backgroundColor: '#C9C9CF', marginTop: 8, marginBottom: 2 },
});

