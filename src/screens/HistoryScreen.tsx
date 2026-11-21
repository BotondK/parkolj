import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { C, Row, styles } from '../components/ui';
import { zoneById, type ZoneId } from '../data/zones';
import type { Lang, Strings } from '../i18n';
import { formatClock, formatDuration, formatFt } from '../logic/pricing';
import type { HistoryItem } from '../types';

export default function HistoryScreen({ t, lang, items, hideTitle }: { t: Strings; lang: Lang; items: HistoryItem[]; hideTitle?: boolean }) {
  const [open, setOpen] = useState<string | null>(null);
  const now = new Date();
  const month = items.filter((i) => {
    const d = new Date(i.startedAt);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });
  const monthTotal = month.reduce((a, i) => a + i.cost, 0);
  const dateFmt = (ms: number) =>
    new Date(ms).toLocaleDateString(lang === 'hu' ? 'hu-HU' : 'en-GB', { month: 'short', day: 'numeric' });

  return (
    <View>
      {!hideTitle && <Text style={styles.h1}>{t.tabHistory}</Text>}
      <View style={[styles.card, { marginTop: hideTitle ? 0 : 12, flexDirection: 'row', justifyContent: 'space-between' }]}>
        <View>
          <Text style={{ color: C.sub, fontSize: 13 }}>{t.thisMonth}</Text>
          <Text style={{ fontSize: 24, fontWeight: '800', color: C.text }}>{formatFt(monthTotal)}</Text>
        </View>
        <View style={{ alignItems: 'flex-end', justifyContent: 'flex-end' }}>
          <Text style={{ color: C.sub }}>
            {month.length} {t.sessions}
          </Text>
        </View>
      </View>

      {items.length === 0 && <Text style={[styles.sub, { marginTop: 16 }]}>{t.historyEmpty}</Text>}

      {items.map((i) => {
        const z = i.zoneId ? zoneById(i.zoneId as ZoneId) : null;
        const isOpen = open === i.id;
        return (
          <Pressable key={i.id} onPress={() => setOpen(isOpen ? null : i.id)} style={[styles.card, { marginTop: 10 }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={[styles.badge, { borderRadius: 10, backgroundColor: z ? z.color : C.sub }]}>
                <Text style={{ color: '#fff', fontWeight: '800' }}>{i.zoneId ?? '–'}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: '700', color: C.text }} numberOfLines={1}>
                  {i.placeName}
                </Text>
                <Text style={{ color: C.sub, fontSize: 13 }}>
                  {dateFmt(i.startedAt)} · {formatClock(new Date(i.startedAt))} · {formatDuration(i.minutes, lang)}
                </Text>
              </View>
              <Text style={{ fontWeight: '800', color: C.text }}>{formatFt(i.cost)}</Text>
            </View>
            {isOpen && (
              <View style={{ marginTop: 12, borderTopWidth: 1, borderColor: C.line, paddingTop: 8 }}>
                <Text style={[styles.label, { marginTop: 4 }]}>{t.receipt}</Text>
                <Row k={t.plate} v={`${i.country} · ${i.plate}`} />
                <Row k={t.zone.charAt(0).toUpperCase() + t.zone.slice(1)} v={i.zoneId ? `${i.zoneId} · ${i.pricePerHour} Ft${t.perHour}` : '—'} />
                <Row
                  k={t.duration}
                  v={`${formatClock(new Date(i.startedAt))}–${formatClock(new Date(i.startedAt + i.minutes * 60000))}`}
                />
                {!!i.payLabel && <Row k={t.payWith} v={i.payLabel} />}
                {!!i.profileLabel && <Row k={t.invoice} v={i.profileLabel} />}
                {!!i.credit && <Row k={t.creditUsed} v={`−${formatFt(i.credit)}`} />}
                <Row k={t.total} v={formatFt(i.cost)} strong />
                <Text style={{ color: C.sub, fontSize: 12, marginTop: 6 }}>{t.receiptNote}</Text>
              </View>
            )}
          </Pressable>
        );
      })}
    </View>
  );
}
