import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Icon } from '../components/icons';
import { EmptyState, PageHeader, PillButton, SegTabs, titleColor } from '../components/kit';
import { bgForWhite, C, isDark } from '../components/ui';
import type { Lang, Strings } from '../i18n';
import type { AccStrings } from '../i18nAccount';
import { formatClock, formatDuration, formatFt } from '../logic/pricing';
import type { HistoryItem, Session } from '../types';
import { floorLabel } from '../components/CarSpotCard';
import HistoryScreen from './HistoryScreen';
import { MonthlyReport } from './PlusScreens';
import { chargeFor } from './steps';

/** Parkolásaim: az aktív parkolás „jegy” kártyaként (mint a BudapestGO-ban a bérlet), alatta a lezártak. */
export default function ParkingsScreen({
  t,
  a,
  lang,
  session,
  history,
  helpBar,
  onHideHelp,
  onDetails,
  onExtend,
  onNew,
  hasPlus,
  onUnlockPlus,
}: {
  t: Strings;
  a: AccStrings;
  lang: Lang;
  session: Session | null;
  history: HistoryItem[];
  helpBar: boolean;
  onHideHelp: () => void;
  onDetails: () => void;
  onExtend: () => void;
  onNew: () => void;
  hasPlus: boolean;
  onUnlockPlus: () => void;
}) {
  const [tab, setTab] = useState<'active' | 'closed'>(session ? 'active' : history.length ? 'closed' : 'active');
  return (
    <View>
      <PageHeader title={a.tabParkings} />
      <SegTabs
        tabs={[
          ['active', a.activeTab],
          ['closed', a.closedTab],
        ]}
        value={tab}
        onChange={setTab}
      />
      {tab === 'active' && (
        <>
          {session && helpBar && (
            <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start', backgroundColor: C.brandSoft, borderRadius: 14, padding: 12, marginBottom: 14 }}>
              <Icon name="info" size={22} color={titleColor()} />
              <Text style={{ flex: 1, color: C.text, fontSize: 14, lineHeight: 20 }}>{a.helpBarText}</Text>
              <Pressable onPress={onHideHelp} hitSlop={10} role="button" accessibilityLabel={a.hide}>
                <Icon name="close" size={18} color={C.sub} />
              </Pressable>
            </View>
          )}
          {session ? <Ticket t={t} a={a} lang={lang} s={session} onDetails={onDetails} onExtend={onExtend} /> : <EmptyState icon="ticket" text={a.noActive} />}
          {!session && <PillButton text={a.newParking} icon="plus" onPress={onNew} />}
        </>
      )}
      {tab === 'closed' && (
        <>
          {history.length > 0 && <MonthlyReport a={a} lang={lang} items={history} hasPlus={hasPlus} onUnlock={onUnlockPlus} />}
          <HistoryScreen t={t} a={a} lang={lang} items={history} hideTitle />
        </>
      )}
    </View>
  );
}

function Ticket({ t, a, lang, s, onDetails, onExtend }: { t: Strings; a: AccStrings; lang: Lang; s: Session; onDetails: () => void; onExtend: () => void }) {
  const z = s.option.zone;
  const leftSec = Math.max(0, s.durationMin * 60 - s.elapsedSec);
  const ok = leftSec > 0;
  const end = new Date(s.startedAt + s.durationMin * 60000);
  const color = bgForWhite(z?.color ?? '#7C3AED');
  return (
    <View style={{ backgroundColor: C.card, borderRadius: 20, borderWidth: isDark ? 0 : 1, borderColor: C.line, overflow: 'hidden' }}>
      {/* Felső sáv: zóna színe, mint egy jegy fejléce */}
      <View style={{ backgroundColor: color, paddingHorizontal: 16, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: 'rgba(255,255,255,.22)', alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: '#fff', fontWeight: '900', fontSize: 20 }}>{z?.id ?? 'P'}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: '#fff', fontWeight: '800', fontSize: 17 }}>{z ? `${t.zoneOf(z.id)}` : t.garage}</Text>
          <Text style={{ color: '#fff', fontSize: 13 }}>{z ? `${z.pricePerHour} Ft${t.perHour} · SMS ${z.smsCode}` : ''}</Text>
        </View>
        <View style={{ backgroundColor: ok ? C.goodSolid : '#B91C1C', borderRadius: 99, paddingHorizontal: 12, paddingVertical: 5, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Icon name={ok ? 'check' : 'close'} size={14} color="#fff" stroke={2.4} />
          <Text style={{ color: '#fff', fontWeight: '800', fontSize: 13 }}>{ok ? a.valid : a.expired}</Text>
        </View>
      </View>
      {/* Perforáció */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: -1 }}>
        {Array.from({ length: 18 }).map((_, i) => (
          <View key={i} style={{ width: 8, height: 4, borderBottomLeftRadius: 4, borderBottomRightRadius: 4, backgroundColor: color, opacity: 0.35 }} />
        ))}
      </View>
      <View style={{ padding: 16, gap: 4 }}>
        <Text style={{ fontSize: 26, fontWeight: '900', color: C.text, letterSpacing: 2 }}>{s.plate}</Text>
        <Text style={{ color: C.sub, fontSize: 14 }} numberOfLines={1}>
          {s.country} · {s.placeName}
        </Text>
        {(!!s.spot || !!s.floor) && (
          <Text style={{ color: C.text, fontSize: 14, fontWeight: '600' }} numberOfLines={2}>
            📍 {[s.floor ? floorLabel(s.floor, a) : '', s.spot ?? ''].filter(Boolean).join(' · ')}
          </Text>
        )}
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 12 }}>
          <View>
            <Text style={{ color: C.sub, fontSize: 13 }}>{a.expires}</Text>
            <Text style={{ fontSize: 30, fontWeight: '800', color: titleColor(), fontVariant: ['tabular-nums'] }}>{formatClock(end)}</Text>
            <Text style={{ color: C.sub, fontSize: 13 }}>
              {ok ? `${formatDuration(Math.ceil(leftSec / 60), lang)} ${t.remaining}` : a.expired} · {formatFt(chargeFor(s))}
            </Text>
          </View>
          {s.sms ? (
            <Text style={{ color: C.sub, fontSize: 13, fontWeight: '700' }}>SMS</Text>
          ) : (
            <Pressable onPress={onExtend} style={{ backgroundColor: C.primary, borderRadius: 30, paddingHorizontal: 18, paddingVertical: 12 }}>
              <Text style={{ color: C.onPrimary, fontWeight: '800', fontSize: 16 }}>{t.extend}</Text>
            </Pressable>
          )}
        </View>
      </View>
      <Pressable onPress={onDetails} style={{ borderTopWidth: 1, borderColor: C.line, paddingVertical: 14, paddingHorizontal: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={{ fontWeight: '700', fontSize: 16, color: titleColor() }}>{a.details}</Text>
        <Icon name="chevron" size={20} color={titleColor()} />
      </Pressable>
    </View>
  );
}
