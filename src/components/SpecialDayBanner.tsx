// Figyelmeztetés ledolgozós szombatra (munkanapi díjfizetés) és áthelyezett pihenőnapra (díjmentes).
// A turistákat és a megszokásból parkolókat a ledolgozós szombat éri váratlanul, ezért pár nappal előtte is szól.
import { Text, View } from 'react-native';
import { LOCALE, type Lang, type Strings } from '../i18n';
import { bpYmd } from '../logic/budapestTime';
import { upcomingSpecialDays } from '../logic/pricing';
import { C, styles } from './ui';

export function specialDayLines(t: Strings, lang: Lang, now: Date, days = 6): string[] {
  const today = bpYmd(now);
  return upcomingSpecialDays(now, days).map(({ ymd, kind }) => {
    const d = new Intl.DateTimeFormat(LOCALE[lang], { month: 'long', day: 'numeric', weekday: 'long', timeZone: 'Europe/Budapest' }).format(new Date(`${ymd}T12:00:00Z`));
    return kind === 'workSaturday' ? t.specialWorkSat(d, ymd === today) : t.specialRestDay(d, ymd === today);
  });
}

export default function SpecialDayBanner({ t, lang, now = new Date(), days }: { t: Strings; lang: Lang; now?: Date; days?: number }) {
  const lines = specialDayLines(t, lang, now, days);
  if (!lines.length) return null;
  return (
    <View testID="special-day" accessibilityRole="alert" style={[styles.banner, { backgroundColor: C.warnSoft, marginTop: 10, marginBottom: 0 }]}>
      {lines.map((l) => (
        <Text key={l} style={{ color: C.warn, fontWeight: '600' }}>
          {l}
        </Text>
      ))}
    </View>
  );
}
