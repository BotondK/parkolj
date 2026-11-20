import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import ParkingMap from './src/components/ParkingMap';
import type { MapMarker } from './src/components/mapTypes';
import { MARKER_COLORS } from './src/components/mapTypes';
import { searchPlaces, type Place } from './src/data/places';
import { zoneAt } from './src/logic/geo';
import { alertUser, requestNotify } from './src/logic/notify';
import { formatClock, formatDuration, formatFt, isCharging, priceFor } from './src/logic/pricing';
import { recommend, type ParkingOption } from './src/logic/recommend';
import { STRINGS, type Lang, type Strings } from './src/i18n';

type Step = 'search' | 'options' | 'navigate' | 'pay' | 'active' | 'summary';

type Session = {
  option: ParkingOption;
  plate: string;
  durationMin: number;
  startedAt: Date;
  elapsedSec: number;
  warnedSoon: boolean;
  warnedExpired: boolean;
};

const STAY_CHOICES = [30, 60, 120, 180, 240];

const C = {
  bg: '#F6F7F9',
  card: '#FFFFFF',
  text: '#0F172A',
  sub: '#64748B',
  line: '#E2E8F0',
  brand: '#0F766E',
  brandSoft: '#CCFBF1',
  warn: '#B45309',
  warnSoft: '#FEF3C7',
  danger: '#B91C1C',
  dangerSoft: '#FEE2E2',
};

export default function App() {
  return (
    <SafeAreaProvider>
      <Main />
    </SafeAreaProvider>
  );
}

function Main() {
  const [lang, setLang] = useState<Lang>('hu');
  const t = STRINGS[lang];
  const { width } = useWindowDimensions();
  const wide = width >= 900;

  const [step, setStep] = useState<Step>('search');
  const [query, setQuery] = useState('');
  const [dest, setDest] = useState<Place | null>(null);
  const [stay, setStay] = useState(120);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [plate, setPlate] = useState('ABC-123');
  const [duration, setDuration] = useState(120);
  const [payMethod, setPayMethod] = useState<'apple' | 'google' | 'card'>(Platform.OS === 'android' ? 'google' : 'apple');
  const [session, setSession] = useState<Session | null>(null);
  const [demoSpeed, setDemoSpeed] = useState(true);
  const [banner, setBanner] = useState<{ kind: 'warn' | 'danger'; text: string } | null>(null);

  const options = useMemo(() => (dest ? recommend(dest, stay) : []), [dest, stay]);
  const selected = options.find((o) => o.id === selectedId) ?? null;

  useEffect(() => {
    if (options.length && !options.some((o) => o.id === selectedId)) setSelectedId(options[0].id);
  }, [options, selectedId]);

  const results = useMemo(() => searchPlaces(query), [query]);

  const pickDest = (p: Place) => {
    setDest(p);
    setSelectedId(null);
    setStep('options');
  };

  // --- Aktív parkolás óra ---
  const speedRef = useRef(demoSpeed);
  speedRef.current = demoSpeed;
  useEffect(() => {
    if (step !== 'active') return;
    const id = setInterval(() => {
      setSession((s) => (s ? { ...s, elapsedSec: s.elapsedSec + (speedRef.current ? 60 : 1) } : s));
    }, 1000);
    return () => clearInterval(id);
  }, [step]);

  useEffect(() => {
    if (!session || step !== 'active') return;
    const left = session.durationMin * 60 - session.elapsedSec;
    if (left <= 600 && left > 0 && !session.warnedSoon) {
      setBanner({ kind: 'warn', text: t.alertSoon });
      alertUser(t.appName, t.alertSoon);
      setSession({ ...session, warnedSoon: true });
    } else if (left <= 0 && !session.warnedExpired) {
      setBanner({ kind: 'danger', text: t.alertExpired });
      alertUser(t.appName, t.alertExpired);
      setSession({ ...session, warnedExpired: true });
    }
  }, [session, step, t]);

  const startSession = () => {
    if (!selected) return;
    requestNotify();
    setBanner(null);
    setSession({
      option: selected,
      plate,
      durationMin: duration,
      startedAt: new Date(),
      elapsedSec: 0,
      warnedSoon: false,
      warnedExpired: false,
    });
    setStep('active');
  };

  const extend = () => {
    if (!session) return;
    const max = session.option.zone?.maxMinutes;
    if (max && session.durationMin + 15 > max) {
      setBanner({ kind: 'danger', text: t.limitReached });
      return;
    }
    setBanner(null);
    setSession({ ...session, durationMin: session.durationMin + 15, warnedSoon: false, warnedExpired: false });
  };

  const stopSession = () => setStep('summary');

  const showGarage = () => {
    const g = options.find((o) => o.kind === 'garage');
    setSession(null);
    setBanner(null);
    if (g) setSelectedId(g.id);
    setStep('options');
  };

  const reset = () => {
    setSession(null);
    setBanner(null);
    setDest(null);
    setSelectedId(null);
    setQuery('');
    setStep('search');
  };

  // --- Térkép ---
  const markers: MapMarker[] = useMemo(() => {
    const m: MapMarker[] = [];
    if (dest) m.push({ id: 'dest', kind: 'dest', lat: dest.lat, lng: dest.lng, label: dest.name });
    if (step === 'active' || step === 'summary') {
      if (session) m.push({ ...session.option.coord, id: session.option.id, kind: session.option.kind, label: '' });
    } else options.forEach((o) => m.push({ ...o.coord, id: o.id, kind: o.kind, label: titleOf(o, t) }));
    return m;
  }, [dest, options, step, session, t]);

  const focus = useMemo(() => {
    if (!dest) return [{ lat: 47.4979, lng: 19.0502 }];
    if (selected && step !== 'options') return [dest, selected.coord];
    return [dest, ...options.map((o) => o.coord)];
  }, [dest, options, selected, step]);

  const onSelect = useCallback((id: string) => {
    setSelectedId(id);
  }, []);

  const map = (
    <View style={wide ? { flex: 1 } : { height: step === 'search' ? 240 : step === 'options' ? 300 : 200 }}>
      <ParkingMap markers={markers} selectedId={selectedId} onSelect={step === 'options' ? onSelect : undefined} focus={focus} />
      {!wide && <View style={styles.mapFade} pointerEvents="none" />}
    </View>
  );

  const panel = (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
      {banner && (
        <View style={[styles.banner, { backgroundColor: banner.kind === 'warn' ? C.warnSoft : C.dangerSoft }]}>
          <Text style={{ color: banner.kind === 'warn' ? C.warn : C.danger, fontWeight: '600' }}>{banner.text}</Text>
        </View>
      )}

      {step === 'search' && (
        <SearchStep t={t} query={query} setQuery={setQuery} results={results} onPick={pickDest} lang={lang} />
      )}

      {step === 'options' && dest && (
        <View>
          <BackLink t={t} onPress={() => setStep('search')} />
          <Text style={styles.h1}>{lang === 'en' && dest.nameEn ? dest.nameEn : dest.name}</Text>
          <Text style={styles.sub}>
            {dest.address} · <DestZone dest={dest} t={t} />
          </Text>

          <Text style={styles.label}>{t.plannedStay}</Text>
          <View style={styles.chipRow}>
            {STAY_CHOICES.map((m) => (
              <Chip key={m} active={stay === m} onPress={() => setStay(m)} text={formatDuration(m, lang)} />
            ))}
          </View>

          <Text style={styles.label}>{t.options}</Text>
          {options.map((o) => (
            <OptionCard
              key={o.id + o.kind}
              o={o}
              t={t}
              lang={lang}
              stay={stay}
              active={selectedId === o.id}
              onPress={() => setSelectedId(o.id)}
            />
          ))}

          <PrimaryButton
            disabled={!selected}
            text={t.navigate}
            onPress={() => {
              if (!selected) return;
              setDuration(Math.min(stay, selected.maxMinutes ?? stay));
              setStep('navigate');
            }}
          />
        </View>
      )}

      {step === 'navigate' && selected && (
        <View>
          <BackLink t={t} onPress={() => setStep('options')} />
          <Text style={styles.h1}>{titleOf(selected, t)}</Text>
          <Text style={styles.sub}>{describe(selected, t)}</Text>
          <Text style={styles.label}>{t.chooseApp}</Text>
          <View style={{ gap: 10 }}>
            {navApps(selected).map((a) => (
              <Pressable key={a.name} style={styles.navBtn} onPress={() => Linking.openURL(a.url)}>
                <Text style={styles.navBtnText}>{a.name}</Text>
                <Text style={{ color: C.sub }}>↗</Text>
              </Pressable>
            ))}
          </View>
          {selected.kind === 'garage' ? (
            <View style={{ marginTop: 18 }}>
              <Text style={styles.sub}>{t.garageNote}</Text>
              <PrimaryButton text={t.openPartner} onPress={() => setBanner({ kind: 'warn', text: t.partnerDemo })} />
            </View>
          ) : (
            <PrimaryButton text={t.arrived} onPress={() => setStep('pay')} />
          )}
        </View>
      )}

      {step === 'pay' && selected && (
        <PayStep
          t={t}
          lang={lang}
          option={selected}
          plate={plate}
          setPlate={setPlate}
          duration={duration}
          setDuration={setDuration}
          payMethod={payMethod}
          setPayMethod={setPayMethod}
          onBack={() => setStep('navigate')}
          onPay={startSession}
        />
      )}

      {step === 'active' && session && (
        <ActiveStep
          t={t}
          lang={lang}
          s={session}
          demoSpeed={demoSpeed}
          setDemoSpeed={setDemoSpeed}
          onExtend={extend}
          onStop={stopSession}
          onGarage={showGarage}
        />
      )}

      {step === 'summary' && session && (
        <View>
          <Text style={styles.h1}>{t.stopped}</Text>
          <View style={[styles.card, { marginTop: 12 }]}>
            <Row k={t.plate} v={session.plate} />
            <Row k={t.zone} v={session.option.zone ? `${session.option.zone.id} ${t.zone}` : '—'} />
            <Row k={t.duration} v={formatDuration(Math.min(session.elapsedSec / 60, session.durationMin), lang)} />
            <Row
              k={t.charged}
              v={formatFt(chargeFor(session))}
              strong
            />
          </View>
          <PrimaryButton text={t.done} onPress={reset} />
        </View>
      )}

      <Text style={styles.demoNote}>{t.demoBanner}</Text>
    </ScrollView>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['top']}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View style={styles.logo}>
            <Text style={{ color: '#fff', fontWeight: '800', fontSize: 16 }}>P</Text>
          </View>
          <View>
            <Text style={{ fontWeight: '800', fontSize: 18, color: C.text }}>{t.appName}</Text>
            <Text style={{ color: C.sub, fontSize: 12 }}>{t.tagline}</Text>
          </View>
        </View>
        <View style={styles.langSwitch}>
          {(['hu', 'en'] as Lang[]).map((l) => (
            <Pressable key={l} onPress={() => setLang(l)} style={[styles.langBtn, lang === l && styles.langBtnOn]}>
              <Text style={{ fontWeight: '700', color: lang === l ? '#fff' : C.sub, fontSize: 12 }}>{l.toUpperCase()}</Text>
            </Pressable>
          ))}
        </View>
      </View>
      {wide ? (
        <View style={{ flex: 1, flexDirection: 'row' }}>
          <View style={{ width: 440, borderRightWidth: 1, borderColor: C.line, backgroundColor: C.bg }}>{panel}</View>
          {map}
        </View>
      ) : (
        <View style={{ flex: 1 }}>
          {map}
          {panel}
        </View>
      )}
    </SafeAreaView>
  );
}

// ---------- segédfüggvények ----------

function chargeFor(s: Session) {
  const z = s.option.zone;
  if (!z) return 0;
  const used = Math.min(s.elapsedSec / 60, s.durationMin);
  return priceFor(z, used);
}

function titleOf(o: ParkingOption, t: Strings) {
  if (o.kind === 'garage') return `${t.garage}: ${o.garage?.name}`;
  return o.kind === 'fastest' ? t.fastest : t.cheapest;
}

function describe(o: ParkingOption, t: Strings) {
  if (o.kind === 'garage') return `${o.distanceM} m · ${o.walkMin} ${t.minutes} ${t.walk}`;
  return `${o.distanceM} m ${t.directions[o.bearing]} ${t.fromDest} · ${o.walkMin} ${t.minutes} ${t.walk}`;
}

function navApps(o: ParkingOption) {
  const { lat, lng } = o.coord;
  return [
    { name: 'Google Maps', url: `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving` },
    { name: 'Apple Maps', url: `https://maps.apple.com/?daddr=${lat},${lng}&dirflg=d` },
    { name: 'Waze', url: `https://waze.com/ul?ll=${lat},${lng}&navigate=yes` },
  ];
}

// ---------- komponensek ----------

function SearchStep({
  t,
  query,
  setQuery,
  results,
  onPick,
  lang,
}: {
  t: Strings;
  query: string;
  setQuery: (s: string) => void;
  results: Place[];
  onPick: (p: Place) => void;
  lang: Lang;
}) {
  const icon: Record<string, string> = { theatre: '🎭', cinema: '🎬', concert: '🎻', sight: '🏛️', mall: '🛍️', sport: '🏟️' };
  return (
    <View>
      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder={t.searchPlaceholder}
        placeholderTextColor="#94A3B8"
        style={styles.search}
        autoCorrect={false}
      />
      <Text style={styles.label}>{query ? '' : t.popular}</Text>
      {results.length === 0 && <Text style={styles.sub}>{t.noResults}</Text>}
      {results.map((p) => (
        <Pressable key={p.id} style={styles.result} onPress={() => onPick(p)}>
          <Text style={{ fontSize: 22 }}>{icon[p.kind]}</Text>
          <View style={{ flex: 1 }}>
            <Text style={{ fontWeight: '600', color: C.text, fontSize: 15 }}>{lang === 'en' && p.nameEn ? p.nameEn : p.name}</Text>
            <Text style={{ color: C.sub, fontSize: 13 }}>{p.address}</Text>
          </View>
          <Text style={{ color: C.sub }}>›</Text>
        </Pressable>
      ))}
    </View>
  );
}

function DestZone({ dest, t }: { dest: Place; t: Strings }) {
  const z = zoneAt(dest);
  if (!z) return <Text>{t.outsideZones}</Text>;
  return (
    <Text style={{ color: z.color, fontWeight: '700' }}>
      {z.id} {t.zone} · {formatFt(z.pricePerHour)}
      {t.perHour}
    </Text>
  );
}

function OptionCard({
  o,
  t,
  lang,
  stay,
  active,
  onPress,
}: {
  o: ParkingOption;
  t: Strings;
  lang: Lang;
  stay: number;
  active: boolean;
  onPress: () => void;
}) {
  const color = MARKER_COLORS[o.kind];
  const sub = o.kind === 'fastest' ? t.fastestSub : o.kind === 'cheapest' ? t.cheapestSub : t.garageSub;
  const charging = o.zone ? isCharging(o.zone) : true;
  const over = o.maxMinutes != null && stay > o.maxMinutes;
  return (
    <Pressable onPress={onPress} style={[styles.card, styles.option, active && { borderColor: color, borderWidth: 2 }]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View style={[styles.badge, { backgroundColor: color, borderRadius: o.kind === 'garage' ? 8 : 999 }]}>
          <Text style={{ color: '#fff', fontWeight: '800' }}>{o.kind === 'fastest' ? '1' : o.kind === 'cheapest' ? '2' : 'P'}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontWeight: '700', fontSize: 16, color: C.text }}>
            {o.kind === 'garage' ? o.garage?.name : o.kind === 'fastest' ? t.fastest : t.cheapest}
          </Text>
          <Text style={{ color: C.sub, fontSize: 13 }}>{sub}</Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={{ fontWeight: '800', fontSize: 17, color: C.text }}>{charging ? formatFt(o.cost) : t.free}</Text>
          <Text style={{ color: C.sub, fontSize: 12 }}>{formatDuration(over ? o.maxMinutes! : stay, lang)}</Text>
        </View>
      </View>
      <View style={styles.metaRow}>
        <Meta text={`🚶 ${o.walkMin} ${t.minutes}`} />
        {o.kind === 'garage' ? (
          <Meta text={`${o.garage?.capacity} ${t.freeSpots}`} />
        ) : (
          <Meta text={`${Math.round(o.availability * 100)}% ${t.chance}`} tone={o.availability > 0.6 ? 'good' : o.availability > 0.4 ? 'mid' : 'bad'} />
        )}
        {o.zone && <Meta text={`${o.zone.id} ${t.zone} · ${o.zone.pricePerHour} Ft${t.perHour}`} />}
        {o.kind === 'garage' && <Meta text={`${o.garage?.pricePerHour} Ft${t.perHour}`} />}
        {o.kind === 'garage' && o.garage?.bookable && <Meta text={t.bookable} tone="good" />}
      </View>
      {over && <Text style={{ color: C.warn, fontSize: 12, marginTop: 8 }}>{t.rule3h}</Text>}
    </Pressable>
  );
}

function PayStep({
  t,
  lang,
  option,
  plate,
  setPlate,
  duration,
  setDuration,
  payMethod,
  setPayMethod,
  onBack,
  onPay,
}: {
  t: Strings;
  lang: Lang;
  option: ParkingOption;
  plate: string;
  setPlate: (s: string) => void;
  duration: number;
  setDuration: (n: number) => void;
  payMethod: 'apple' | 'google' | 'card';
  setPayMethod: (m: 'apple' | 'google' | 'card') => void;
  onBack: () => void;
  onPay: () => void;
}) {
  const z = option.zone;
  const max = z?.maxMinutes ?? 600;
  const price = z ? priceFor(z, duration) : 0;
  const charging = z ? isCharging(z) : false;
  const smsNumber = z ? `+3630763${z.smsCode}` : '';
  const end = new Date(Date.now() + duration * 60000);
  return (
    <View>
      <BackLink t={t} onPress={onBack} />
      <Text style={styles.h1}>{t.startParking}</Text>
      {z && (
        <View style={[styles.zonePill, { backgroundColor: `${z.color}22` }]}>
          <Text style={{ color: z.color, fontWeight: '800' }}>
            {z.id} {t.zone} · {z.pricePerHour} Ft{t.perHour} · {z.maxMinutes ? `${t.maxStay} ${formatDuration(z.maxMinutes, lang)}` : t.noLimit}
          </Text>
        </View>
      )}
      {!charging && <Text style={[styles.sub, { marginTop: 8 }]}>{t.notCharging}</Text>}

      <Text style={styles.label}>{t.plate}</Text>
      <TextInput
        value={plate}
        onChangeText={(s) => setPlate(s.toUpperCase())}
        style={[styles.search, { fontWeight: '800', letterSpacing: 2, fontSize: 20 }]}
        autoCapitalize="characters"
      />

      <Text style={styles.label}>{t.duration}</Text>
      <View style={styles.stepper}>
        <Pressable style={styles.stepBtn} onPress={() => setDuration(Math.max(15, duration - 15))}>
          <Text style={styles.stepBtnText}>−</Text>
        </Pressable>
        <View style={{ alignItems: 'center', flex: 1 }}>
          <Text style={{ fontSize: 26, fontWeight: '800', color: C.text }}>{formatDuration(duration, lang)}</Text>
          <Text style={{ color: C.sub }}>
            {t.endsAt}: {formatClock(end)} · {formatFt(price)}
          </Text>
        </View>
        <Pressable
          style={[styles.stepBtn, duration + 15 > max && { opacity: 0.35 }]}
          onPress={() => setDuration(Math.min(max, duration + 15))}
        >
          <Text style={styles.stepBtnText}>+</Text>
        </Pressable>
      </View>
      {z?.maxMinutes && <Text style={{ color: C.warn, fontSize: 12, marginTop: 8 }}>{t.rule3h}</Text>}

      <Text style={styles.label}>{t.payWith}</Text>
      <View style={styles.chipRow}>
        <Chip text="Apple Pay" active={payMethod === 'apple'} onPress={() => setPayMethod('apple')} />
        <Chip text="Google Pay" active={payMethod === 'google'} onPress={() => setPayMethod('google')} />
        <Chip text="Visa •••• 4242" active={payMethod === 'card'} onPress={() => setPayMethod('card')} />
      </View>
      <Text style={[styles.sub, { fontSize: 12 }]}>{t.demoPay}</Text>

      <PrimaryButton text={`${t.payAndStart} · ${formatFt(price)}`} onPress={onPay} disabled={plate.trim().length < 4} />

      {z && (
        <View style={[styles.card, { marginTop: 18 }]}>
          <Text style={{ color: C.sub, fontSize: 13 }}>{t.smsFallback}</Text>
          <Text style={{ fontWeight: '700', marginTop: 6, color: C.text }}>
            {plate} → {smsNumber}
          </Text>
          <Pressable
            onPress={() => Linking.openURL(`sms:${smsNumber}${Platform.OS === 'ios' ? '&' : '?'}body=${encodeURIComponent(plate)}`)}
            style={[styles.navBtn, { marginTop: 10 }]}
          >
            <Text style={styles.navBtnText}>{t.smsSend}</Text>
            <Text style={{ color: C.sub }}>✉</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

function ActiveStep({
  t,
  lang,
  s,
  demoSpeed,
  setDemoSpeed,
  onExtend,
  onStop,
  onGarage,
}: {
  t: Strings;
  lang: Lang;
  s: Session;
  demoSpeed: boolean;
  setDemoSpeed: (b: boolean) => void;
  onExtend: () => void;
  onStop: () => void;
  onGarage: () => void;
}) {
  const leftSec = Math.max(0, s.durationMin * 60 - s.elapsedSec);
  const pct = Math.min(1, s.elapsedSec / (s.durationMin * 60));
  const endAt = new Date(s.startedAt.getTime() + s.durationMin * 60000);
  const max = s.option.zone?.maxMinutes;
  const atLimit = max != null && s.durationMin + 15 > max;
  const color = leftSec <= 600 ? (leftSec === 0 ? C.danger : C.warn) : C.brand;
  const hh = Math.floor(leftSec / 3600);
  const mm = Math.floor((leftSec % 3600) / 60);
  const ss = leftSec % 60;
  return (
    <View>
      <Text style={styles.h1}>{t.active}</Text>
      <Text style={styles.sub}>
        {s.plate} · {s.option.zone ? `${s.option.zone.id} ${t.zone}` : ''} · {t.endsAt} {formatClock(endAt)}
      </Text>
      <View style={[styles.card, { alignItems: 'center', marginTop: 14, paddingVertical: 24 }]}>
        <Text style={{ fontSize: 48, fontWeight: '800', color, fontVariant: ['tabular-nums'] }}>
          {hh}:{mm.toString().padStart(2, '0')}:{ss.toString().padStart(2, '0')}
        </Text>
        <Text style={{ color: C.sub }}>{t.remaining}</Text>
        <View style={styles.progress}>
          <View style={{ width: `${pct * 100}%`, height: '100%', backgroundColor: color, borderRadius: 99 }} />
        </View>
        <Text style={{ color: C.sub, marginTop: 10 }}>
          {t.costSoFar}: <Text style={{ fontWeight: '800', color: C.text }}>{formatFt(chargeFor(s))}</Text>
        </Text>
      </View>
      <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
        <Pressable style={[styles.secondary, atLimit && { opacity: 0.4 }]} onPress={onExtend}>
          <Text style={styles.secondaryText}>{t.extend}</Text>
        </Pressable>
        <Pressable style={[styles.secondary, { borderColor: C.danger }]} onPress={onStop}>
          <Text style={[styles.secondaryText, { color: C.danger }]}>{t.stop}</Text>
        </Pressable>
      </View>
      {atLimit && (
        <View style={[styles.card, { marginTop: 14, backgroundColor: C.warnSoft, borderColor: C.warnSoft }]}>
          <Text style={{ color: C.warn, fontWeight: '600' }}>{t.limitReached}</Text>
          <Pressable onPress={onGarage} style={{ marginTop: 8 }}>
            <Text style={{ color: C.brand, fontWeight: '700' }}>{t.suggestGarage} →</Text>
          </Pressable>
        </View>
      )}
      <View style={styles.demoRow}>
        <Text style={{ color: C.sub, flex: 1, fontSize: 13 }}>{t.demoSpeed}</Text>
        <Switch value={demoSpeed} onValueChange={setDemoSpeed} />
      </View>
    </View>
  );
}

function Row({ k, v, strong }: { k: string; v: string; strong?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 }}>
      <Text style={{ color: C.sub }}>{k}</Text>
      <Text style={{ color: C.text, fontWeight: strong ? '800' : '600' }}>{v}</Text>
    </View>
  );
}

function Meta({ text, tone }: { text: string; tone?: 'good' | 'mid' | 'bad' }) {
  const bg = tone === 'good' ? '#DCFCE7' : tone === 'mid' ? '#FEF3C7' : tone === 'bad' ? '#FEE2E2' : '#F1F5F9';
  const fg = tone === 'good' ? '#166534' : tone === 'mid' ? '#92400E' : tone === 'bad' ? '#991B1B' : '#475569';
  return (
    <View style={{ backgroundColor: bg, borderRadius: 99, paddingHorizontal: 8, paddingVertical: 3 }}>
      <Text style={{ color: fg, fontSize: 12, fontWeight: '600' }}>{text}</Text>
    </View>
  );
}

function Chip({ text, active, onPress }: { text: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.chip, active && styles.chipOn]}>
      <Text style={{ color: active ? '#fff' : C.text, fontWeight: '600' }}>{text}</Text>
    </Pressable>
  );
}

function PrimaryButton({ text, onPress, disabled }: { text: string; onPress: () => void; disabled?: boolean }) {
  return (
    <Pressable onPress={disabled ? undefined : onPress} style={[styles.primary, disabled && { opacity: 0.4 }]}>
      <Text style={styles.primaryText}>{text}</Text>
    </Pressable>
  );
}

function BackLink({ t, onPress }: { t: Strings; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={{ marginBottom: 6, alignSelf: 'flex-start' }}>
      <Text style={{ color: C.brand, fontWeight: '600' }}>‹ {t.back}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
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
  h1: { fontSize: 24, fontWeight: '800', color: C.text },
  sub: { color: C.sub, marginTop: 4, fontSize: 14, lineHeight: 20 },
  label: { marginTop: 18, marginBottom: 8, fontSize: 13, fontWeight: '700', color: C.sub, textTransform: 'uppercase', letterSpacing: 0.6 },
  search: {
    backgroundColor: C.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.line,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: C.text,
  },
  result: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: C.card,
    borderRadius: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: C.line,
  },
  card: { backgroundColor: C.card, borderRadius: 16, borderWidth: 1, borderColor: C.line, padding: 14 },
  option: { marginBottom: 10 },
  badge: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 6 },
  chip: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 99, backgroundColor: C.card, borderWidth: 1, borderColor: C.line },
  chipOn: { backgroundColor: C.text, borderColor: C.text },
  primary: { marginTop: 18, backgroundColor: C.brand, borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
  primaryText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  secondary: { flex: 1, borderWidth: 1.5, borderColor: C.brand, borderRadius: 14, paddingVertical: 14, alignItems: 'center', backgroundColor: C.card },
  secondaryText: { color: C.brand, fontWeight: '800', fontSize: 15 },
  navBtn: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  navBtnText: { fontWeight: '700', fontSize: 15, color: C.text },
  zonePill: { alignSelf: 'flex-start', borderRadius: 99, paddingHorizontal: 12, paddingVertical: 6, marginTop: 10 },
  stepper: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.card, borderRadius: 16, borderWidth: 1, borderColor: C.line, padding: 10 },
  stepBtn: { width: 48, height: 48, borderRadius: 12, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' },
  stepBtnText: { fontSize: 26, fontWeight: '700', color: C.text },
  progress: { width: '100%', height: 8, backgroundColor: '#F1F5F9', borderRadius: 99, marginTop: 16, overflow: 'hidden' },
  banner: { borderRadius: 12, padding: 12, marginBottom: 12 },
  demoRow: { flexDirection: 'row', alignItems: 'center', marginTop: 18, paddingTop: 12, borderTopWidth: 1, borderColor: C.line },
  demoNote: { marginTop: 24, color: '#94A3B8', fontSize: 12, textAlign: 'center' },
});
