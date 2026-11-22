import { track } from '../logic/analytics';
import { useMemo, useState } from 'react';
import { Platform, Pressable, Share, Text, TextInput, View } from 'react-native';
import { Icon, type IconName } from '../components/icons';
import { PageHeader, PillButton, Segmented, ToggleRow, Section, titleColor } from '../components/kit';
import { C, isDark, PrimaryButton, styles } from '../components/ui';
import { LOCALE, type Lang } from '../i18n';
import type { AccStrings } from '../i18nAccount';
import { formatFt } from '../logic/pricing';
import { historyCsv, PLUS_MONTHLY_FT, PLUS_ONCE_FT, type HistoryItem, type Session, type Settings } from '../types';

const GOLD = '#F5B301';

/** Kis „PLUSZ” címke */
export function PlusBadge({ small }: { small?: boolean }) {
  return (
    <View style={{ backgroundColor: GOLD, borderRadius: 6, paddingHorizontal: small ? 5 : 7, paddingVertical: small ? 1 : 2, alignSelf: 'flex-start' }}>
      <Text style={{ color: '#2C1A00', fontWeight: '900', fontSize: small ? 10 : 11, letterSpacing: 0.5 }}>PLUSZ</Text>
    </View>
  );
}

/** Menü → Parkolj Plusz: mit ad, mennyibe kerül, előfizetés (demó) */
export function PlusPage({
  a,
  lang,
  settings,
  patchSettings,
  payLabel,
  onBack,
}: {
  a: AccStrings;
  lang: Lang;
  settings: Settings;
  patchSettings: (p: Partial<Settings>) => void;
  payLabel: string;
  onBack: () => void;
}) {
  const active = settings.plus === 'monthly';
  const features: [IconName, string, string][] = [
    ['clock', a.plusF1, a.plusF1d],
    ['receipt', a.plusF2, a.plusF2d],
    ['pin', a.plusF3, a.plusF3d],
  ];
  const since = new Date(settings.plusSince || Date.now()).toLocaleDateString(LOCALE[lang], { year: 'numeric', month: 'short', day: 'numeric' });
  return (
    <View>
      <PageHeader title={a.plusName} onBack={onBack} right={<PlusBadge />} />
      <Text style={[styles.sub, { marginTop: -8, marginBottom: 16, fontSize: 16 }]}>{a.plusTag}</Text>
      <Section>
        {features.map(([icon, title, desc], i) => (
          <View key={title} style={{ flexDirection: 'row', gap: 14, padding: 16, borderBottomWidth: i < features.length - 1 ? 1 : 0, borderColor: C.line }}>
            <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: C.brandSoft, alignItems: 'center', justifyContent: 'center' }}>
              <Icon name={icon} size={22} color={titleColor()} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 16, fontWeight: '700', color: C.text }}>{title}</Text>
              <Text style={{ color: C.sub, fontSize: 14, lineHeight: 20, marginTop: 2 }}>{desc}</Text>
            </View>
          </View>
        ))}
      </Section>

      {active ? (
        <View style={[styles.card, { borderColor: GOLD, borderWidth: 2, gap: 6 }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Icon name="check" size={22} color={C.good} />
            <Text style={{ fontSize: 17, fontWeight: '800', color: C.text }}>{a.plusActive(since)}</Text>
          </View>
          <Text style={{ color: C.sub }}>
            {a.plusMonthlyPrice(formatFt(PLUS_MONTHLY_FT))} · {payLabel}
          </Text>
          <Pressable onPress={() => patchSettings({ plus: 'none', plusSince: 0 })} style={{ marginTop: 8, alignSelf: 'flex-start' }}>
            <Text style={{ color: C.danger, fontWeight: '700' }}>{a.plusCancel}</Text>
          </Pressable>
        </View>
      ) : (
        <View style={{ gap: 12 }}>
          <View style={[styles.card, { borderColor: isDark ? C.primary : C.brand, borderWidth: 2 }]}>
            <Text style={{ color: C.sub, fontWeight: '700' }}>{a.plusMonthly}</Text>
            <Text style={{ fontSize: 26, fontWeight: '900', color: titleColor() }}>{a.plusMonthlyPrice(formatFt(PLUS_MONTHLY_FT))}</Text>
            <Text style={{ color: C.sub }}>{a.plusMonthlySub}</Text>
            <PrimaryButton text={a.plusSubscribe} onPress={() => (track('plus_subscribe'), patchSettings({ plus: 'monthly', plusSince: Date.now() }))} />
            <Text style={{ color: C.sub, fontSize: 12, marginTop: 8 }}>
              {payLabel} · {a.plusDemo}
            </Text>
          </View>
          <View style={styles.card}>
            <Text style={{ color: C.sub, fontWeight: '700' }}>{a.plusOnce}</Text>
            <Text style={{ fontSize: 22, fontWeight: '900', color: C.text }}>{a.plusOncePrice(formatFt(PLUS_ONCE_FT))}</Text>
            <Text style={{ color: C.sub }}>{a.plusOnceSub}</Text>
          </View>
          <Text style={{ color: C.sub, fontSize: 12, textAlign: 'center' }}>{a.plusCompare}</Text>
        </View>
      )}

      <Text style={styles.label}>{a.autoExtend}</Text>
      <Section>
        <ToggleRow icon="clock" label={a.autoExtend} value={settings.autoExtend} onChange={(autoExtend) => patchSettings({ autoExtend })} last={!settings.autoExtend} />
        {settings.autoExtend && (
          <View style={{ paddingHorizontal: 16, paddingTop: 4, paddingBottom: 16, gap: 10 }}>
            <Text style={{ color: C.sub, fontSize: 13 }}>{a.autoExtendLimit}</Text>
            <Segmented
              options={([30, 60, 120] as const).map((m) => [m, a.extStep(m)] as [30 | 60 | 120, string])}
              value={settings.autoExtendMax}
              onChange={(autoExtendMax) => patchSettings({ autoExtendMax })}
            />
          </View>
        )}
      </Section>
    </View>
  );
}

/** Fizetésnél: alkalmi Plusz kapcsoló (vagy jelzés, hogy benne van az előfizetésben) */
export function PlusOnPay({ a, monthly, value, onChange }: { a: AccStrings; monthly: boolean; value: boolean; onChange: (v: boolean) => void }) {
  if (monthly)
    return (
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 14 }}>
        <PlusBadge />
        <Text style={{ color: C.sub, flex: 1 }}>{a.plusIncluded}</Text>
      </View>
    );
  return (
    <Pressable
      onPress={() => onChange(!value)}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 14, padding: 12, borderRadius: 14, borderWidth: 1.5, borderColor: value ? GOLD : C.line, backgroundColor: C.card }}
      role="checkbox"
      aria-checked={value}
    >
      <View style={{ width: 24, height: 24, borderRadius: 7, borderWidth: 2, borderColor: value ? GOLD : C.sub, backgroundColor: value ? GOLD : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
        {value && <Icon name="check" size={16} color="#2C1A00" stroke={2.6} />}
      </View>
      <Text style={{ flex: 1, color: C.text, fontSize: 14, lineHeight: 19 }}>{a.plusOnPay(formatFt(PLUS_ONCE_FT))}</Text>
      <PlusBadge small />
    </Pressable>
  );
}

/** Aktív parkolásnál: automatikus hosszabbítás állapota és „hol hagytam az autót” (Plusz), különben ajánló */
export function PlusActivePanel({
  a,
  s,
  hasPlus,
  settings,
  patchSettings,
  setSpot,
  onUnlock,
}: {
  a: AccStrings;
  s: Session;
  hasPlus: boolean;
  settings: Settings;
  patchSettings: (p: Partial<Settings>) => void;
  setSpot: (spot: string) => void;
  onUnlock: () => void;
}) {
  const [draft, setDraft] = useState(s.spot ?? '');
  const saved = draft === (s.spot ?? '') && !!s.spot;
  if (!hasPlus)
    return (
      <Pressable onPress={onUnlock} style={[styles.card, { marginTop: 14, flexDirection: 'row', alignItems: 'center', gap: 12, borderColor: GOLD }]}>
        <Icon name="clock" size={24} color={titleColor()} />
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
            <Text style={{ fontWeight: '700', color: C.text }}>{a.plusF1}</Text>
            <PlusBadge small />
          </View>
          <Text style={{ color: C.sub, fontSize: 13, marginTop: 2 }}>{a.plusF3}</Text>
        </View>
        <Text style={{ color: titleColor(), fontWeight: '700' }}>{a.plusUnlock} ›</Text>
      </Pressable>
    );
  return (
    <View style={[styles.card, { marginTop: 14, gap: 10 }]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <PlusBadge small />
        <View style={{ flex: 1 }}>
          <Text style={{ fontWeight: '700', color: C.text }}>{a.autoExtend}</Text>
          <Text style={{ color: C.sub, fontSize: 13 }}>
            {s.autoExtMin ? `+${s.autoExtMin} / ` : ''}
            {a.autoExtendMax(settings.autoExtendMax)}
          </Text>
        </View>
        <Pressable
          onPress={() => patchSettings({ autoExtend: !settings.autoExtend })}
          role="switch"
          aria-checked={settings.autoExtend}
          aria-label={a.autoExtend}
          style={{ width: 46, height: 28, borderRadius: 14, backgroundColor: settings.autoExtend ? C.primary : C.line, padding: 3, alignItems: settings.autoExtend ? 'flex-end' : 'flex-start' }}
        >
          <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: '#fff' }} />
        </Pressable>
      </View>
      <View style={{ height: 1, backgroundColor: C.line }} />
      <Text style={{ fontWeight: '700', color: C.text }}>{a.spotTitle}</Text>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <TextInput
          accessibilityLabel={a.spotTitle}
          value={draft}
          onChangeText={setDraft}
          placeholder={a.spotPlaceholder}
          placeholderTextColor={C.sub}
          maxLength={120}
          style={{ flex: 1, minWidth: 0, height: 46, borderRadius: 12, borderWidth: 1, borderColor: C.line, paddingHorizontal: 12, fontSize: 15, color: C.text, backgroundColor: C.card }}
        />
        <Pressable
          onPress={() => setSpot(draft.trim())}
          disabled={saved}
          style={{ height: 46, borderRadius: 23, paddingHorizontal: 16, justifyContent: 'center', backgroundColor: saved ? C.goodSoft : C.primary }}
        >
          <Text style={{ fontWeight: '700', color: saved ? C.good : C.onPrimary }}>{saved ? a.spotSaved : a.spotSave}</Text>
        </Pressable>
      </View>
    </View>
  );
}

/** Lezárt parkolások fölött: havi kimutatás profilonként + CSV (Plusz) */
export function MonthlyReport({ a, lang, items, hasPlus, onUnlock }: { a: AccStrings; lang: Lang; items: HistoryItem[]; hasPlus: boolean; onUnlock: () => void }) {
  const months = useMemo(() => {
    const keys = Array.from(new Set(items.map((i) => { const d = new Date(i.startedAt); return `${d.getFullYear()}-${d.getMonth()}`; })));
    const now = new Date();
    const cur = `${now.getFullYear()}-${now.getMonth()}`;
    return keys.includes(cur) ? keys : [cur, ...keys];
  }, [items]);
  const [month, setMonth] = useState(months[0]);
  const [done, setDone] = useState(false);
  const sel = items.filter((i) => { const d = new Date(i.startedAt); return `${d.getFullYear()}-${d.getMonth()}` === month; });
  const total = sel.reduce((s, i) => s + i.cost + (i.plusFee ?? 0), 0);
  const byProfile = new Map<string, number>();
  sel.forEach((i) => byProfile.set(i.profileLabel || a.reportNoProfile, (byProfile.get(i.profileLabel || a.reportNoProfile) ?? 0) + i.cost + (i.plusFee ?? 0)));
  const label = (k: string) => {
    const [y, m] = k.split('-').map(Number);
    return new Date(y, m, 1).toLocaleDateString(LOCALE[lang], { year: 'numeric', month: 'long' });
  };
  const exportCsv = async () => {
    const csv = historyCsv(sel);
    const name = `parkolj-${month.replace(/-(\d+)$/, (_, m) => `-${String(Number(m) + 1).padStart(2, '0')}`)}.csv`;
    if (Platform.OS === 'web') {
      const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
      const el = document.createElement('a');
      el.href = url;
      el.download = name;
      el.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } else await Share.share({ title: name, message: csv });
    setDone(true);
  };
  return (
    <View style={[styles.card, { marginBottom: 14, gap: 8 }]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Text style={{ fontSize: 17, fontWeight: '800', color: titleColor(), flex: 1 }}>{a.report}</Text>
        <PlusBadge small />
      </View>
      {months.length > 1 && (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
          {months.slice(0, 4).map((k) => (
            <Pressable key={k} onPress={() => setMonth(k)} style={[styles.chip, { paddingVertical: 6 }, month === k && styles.chipOn]}>
              <Text style={{ color: month === k ? C.onBrand : C.text, fontWeight: '600', fontSize: 13 }}>{label(k)}</Text>
            </Pressable>
          ))}
        </View>
      )}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <Text style={{ color: C.sub }}>
          {label(month)} · {a.reportCount(sel.length)}
        </Text>
        <Text style={{ fontSize: 22, fontWeight: '900', color: C.text }}>{formatFt(total)}</Text>
      </View>
      {hasPlus ? (
        <>
          {[...byProfile.entries()].map(([k, v]) => (
            <View key={k} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ color: C.sub, flex: 1 }} numberOfLines={1}>
                {k}
              </Text>
              <Text style={{ color: C.text, fontWeight: '700' }}>{formatFt(v)}</Text>
            </View>
          ))}
          <PillButton text={done ? a.reportCsvDone : a.reportCsv} icon="receipt" onPress={exportCsv} />
        </>
      ) : (
        <Pressable onPress={onUnlock} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}>
          <Text style={{ color: C.sub, flex: 1, fontSize: 13 }}>{a.plusF2d}</Text>
          <Text style={{ color: titleColor(), fontWeight: '700' }}>{a.plusUnlock} ›</Text>
        </Pressable>
      )}
    </View>
  );
}
