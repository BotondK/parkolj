import { Linking, Pressable, Text, View } from 'react-native';
import SpecialDayBanner from '../components/SpecialDayBanner';
import { bgForWhite, C, styles } from '../components/ui';
import { ZONES } from '../data/zones';
import type { Lang, Strings } from '../i18n';
import { formatDuration, formatFt, isCharging } from '../logic/pricing';

export default function InfoScreen({ t, lang, hideTitle, district }: { t: Strings; lang: Lang; hideTitle?: boolean; district?: string | null }) {
  const hours = (h: [number, number] | null) => (h ? `${h[0]}–${h[1]}` : '–');
  return (
    <View>
      {!hideTitle && <Text style={styles.h1}>{t.infoTitle}</Text>}
      <SpecialDayBanner t={t} lang={lang} days={14} />

      <Text style={styles.label}>{t.infoZones}</Text>
      <View style={[styles.card, { padding: 0, overflow: 'hidden' }]}>
        {ZONES.map((z, i) => {
          const now = isCharging(z);
          return (
            <View
              key={z.id}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
                padding: 12,
                borderTopWidth: i ? 1 : 0,
                borderColor: C.line,
              }}
            >
              <View style={[styles.badge, { borderRadius: 10, backgroundColor: bgForWhite(z.color) }]}>
                <Text style={{ color: '#fff', fontWeight: '800' }}>{z.id}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: '800', color: C.text, fontSize: 16 }}>
                  {z.pricePerHour} Ft{t.perHour}
                </Text>
                <Text style={{ color: C.sub, fontSize: 12 }}>
                  {t.infoWeekdays} {hours(z.weekdayHours)} · {t.surchargeShort} {formatFt(z.surcharge[0])}
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={{ color: C.text, fontWeight: '600', fontSize: 13 }}>
                  {z.maxMinutes ? `${t.maxStay} ${formatDuration(z.maxMinutes, lang)}` : t.noLimit}
                </Text>
                <Text style={{ color: now ? C.warn : C.good, fontSize: 12, fontWeight: '600' }}>
                  {now ? `${t.infoHours} ●` : t.free}
                </Text>
              </View>
            </View>
          );
        })}
      </View>
      <Text style={{ color: C.sub, fontSize: 12, marginTop: 6 }}>{t.infoDemoHours}</Text>

      {[
        [t.infoPayTitle, t.infoPay],
        [t.info3hTitle, t.info3h],
        [t.infoFreeTitle, t.infoFree],
        [t.infoSurchargeTitle, t.infoSurcharge],
        [t.infoResidentTitle, t.infoResident],
        [t.infoTouristTitle, t.infoTourist],
      ].map(([h, b]) => (
        <View key={h} style={{ marginTop: 18 }}>
          <Text style={{ fontWeight: '800', fontSize: 16, color: C.text }}>{h}</Text>
          <Text style={[styles.sub, { marginTop: 4 }]}>{b}</Text>
          {h === t.infoResidentTitle && (
            <Pressable
              role="link"
              hitSlop={8}
              style={{ marginTop: 6, alignSelf: 'flex-start' }}
              onPress={() => Linking.openURL(`https://www.google.com/search?q=${encodeURIComponent(t.infoResidentSearch(district ?? 'Budapest kerület'))}`)}
            >
              <Text style={{ color: C.brand, fontWeight: '700' }}>{t.infoResidentLink(district ?? 'Budapest')} ↗</Text>
            </Pressable>
          )}
        </View>
      ))}
    </View>
  );
}
