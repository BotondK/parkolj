import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Linking, Platform, Pressable, ScrollView, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import ParkingMap from './src/components/ParkingMap';
import type { MapMarker } from './src/components/mapTypes';
import { BackLink, C, Chip, PrimaryButton, Row, styles } from './src/components/ui';
import { searchPlaces, type Place } from './src/data/places';
import type { LatLng } from './src/data/zones';
import { STRINGS, type Lang } from './src/i18n';
import { locate } from './src/logic/locate';
import { alertUser, requestNotify } from './src/logic/notify';
import { formatDuration, formatFt, isCharging } from './src/logic/pricing';
import { hereOption, recommend, type ParkingOption } from './src/logic/recommend';
import { loadJSON, saveJSON } from './src/logic/storage';
import HistoryScreen from './src/screens/HistoryScreen';
import InfoScreen from './src/screens/InfoScreen';
import {
  ActiveStep,
  chargeFor,
  describe,
  DestZone,
  navApps,
  OptionCard,
  PayStep,
  SearchStep,
  titleOf,
} from './src/screens/steps';
import type { Car, HistoryItem, Session } from './src/types';

type Step = 'search' | 'options' | 'navigate' | 'pay' | 'active' | 'summary';
type Tab = 'park' | 'history' | 'info';

const STAY_CHOICES = [30, 60, 120, 180, 240];

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

  const [tab, setTab] = useState<Tab>('park');
  const [step, setStep] = useState<Step>('search');
  const [query, setQuery] = useState('');
  const [dest, setDest] = useState<Place | null>(null);
  const [here, setHere] = useState<LatLng | null>(null);
  const [locMsg, setLocMsg] = useState<string | null>(null);
  const [stay, setStay] = useState(120);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [cars, setCars] = useState<Car[]>([{ id: 'demo', plate: 'ABC-123', country: 'H' }]);
  const [carId, setCarId] = useState<string | null>('demo');
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [duration, setDuration] = useState(120);
  const [payMethod, setPayMethod] = useState<'apple' | 'google' | 'card'>(Platform.OS === 'android' ? 'google' : 'apple');
  const [session, setSession] = useState<Session | null>(null);
  const [demoSpeed, setDemoSpeed] = useState(true);
  const [banner, setBanner] = useState<{ kind: 'warn' | 'danger'; text: string } | null>(null);
  const [loaded, setLoaded] = useState(false);

  // --- Helyi tárolás: autók, előzmények, aktív parkolás, nyelv ---
  useEffect(() => {
    (async () => {
      const [c, h, s, l] = await Promise.all([
        loadJSON<Car[] | null>('cars', null),
        loadJSON<HistoryItem[]>('history', []),
        loadJSON<Session | null>('session', null),
        loadJSON<Lang | null>('lang', null),
      ]);
      if (c && c.length) {
        setCars(c);
        setCarId(c[0].id);
      }
      setHistory(h);
      if (l) setLang(l);
      if (s) {
        setSession(s);
        setStep('active');
      }
      setLoaded(true);
    })();
  }, []);
  useEffect(() => {
    if (loaded) saveJSON('cars', cars);
  }, [cars, loaded]);
  useEffect(() => {
    if (loaded) saveJSON('history', history);
  }, [history, loaded]);
  useEffect(() => {
    if (loaded) saveJSON('lang', lang);
  }, [lang, loaded]);
  useEffect(() => {
    if (loaded) saveJSON('session', step === 'active' ? session : null);
  }, [session, step, loaded]);

  const options = useMemo(() => (dest ? recommend(dest, stay) : []), [dest, stay]);
  const hereOpt = useMemo(() => (here ? hereOption(here, stay) : null), [here, stay]);
  const selected = hereOpt ?? options.find((o) => o.id === selectedId) ?? null;

  useEffect(() => {
    if (options.length && !options.some((o) => o.id === selectedId)) setSelectedId(options[0].id);
  }, [options, selectedId]);

  const results = useMemo(() => searchPlaces(query), [query]);

  const pickDest = (p: Place) => {
    setHere(null);
    setDest(p);
    setSelectedId(null);
    setStep('options');
  };

  const pickHere = useCallback((pt: LatLng) => {
    setDest(null);
    setLocMsg(null);
    setHere(pt);
  }, []);

  const useMyLocation = async () => {
    setLocMsg(t.locating);
    const pt = await locate();
    if (pt) pickHere(pt);
    else setLocMsg(t.locationFailed);
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
    const car = cars.find((c) => c.id === carId);
    if (!selected || !car) return;
    requestNotify();
    setBanner(null);
    setSession({
      option: selected,
      placeName: dest ? (lang === 'en' && dest.nameEn ? dest.nameEn : dest.name) : t.hereTitle,
      plate: car.plate,
      country: car.country,
      durationMin: duration,
      startedAt: Date.now(),
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

  const stopSession = () => {
    if (session) {
      const z = session.option.zone;
      const minutes = Math.max(1, Math.round(Math.min(session.elapsedSec / 60, session.durationMin)));
      setHistory((h) => [
        {
          id: `${session.startedAt}`,
          placeName: session.placeName,
          zoneId: z?.id ?? null,
          pricePerHour: z?.pricePerHour ?? 0,
          plate: session.plate,
          country: session.country,
          startedAt: session.startedAt,
          minutes,
          cost: chargeFor(session),
        },
        ...h,
      ]);
    }
    setBanner(null);
    setStep('summary');
  };

  const showGarage = () => {
    // A 3 órás határnál: vissza a célponthoz, garázs kijelölve
    const s = session;
    setSession(null);
    setBanner(null);
    setHere(null);
    if (dest) {
      const g = options.find((o) => o.kind === 'garage');
      if (g) setSelectedId(g.id);
      setStep('options');
    } else if (s) {
      setDest({
        id: 'here',
        name: s.placeName,
        address: '',
        kind: 'sight',
        lat: s.option.coord.lat,
        lng: s.option.coord.lng,
      });
      setStep('options');
    } else setStep('search');
  };

  const addCar = (plate: string, country: string) => {
    const car = { id: `${Date.now()}`, plate, country };
    setCars((c) => [...c.filter((x) => x.id !== 'demo'), car]);
    setCarId(car.id);
  };

  const reset = () => {
    setSession(null);
    setBanner(null);
    setDest(null);
    setHere(null);
    setSelectedId(null);
    setQuery('');
    setStep('search');
  };

  // --- Térkép ---
  const markers: MapMarker[] = useMemo(() => {
    const m: MapMarker[] = [];
    if (tab !== 'park') {
      if (session && step === 'active') m.push({ ...session.option.coord, id: 's', kind: session.option.kind, label: '' });
      return m;
    }
    if (dest) m.push({ id: 'dest', kind: 'dest', lat: dest.lat, lng: dest.lng, label: dest.name });
    if (step === 'active' || step === 'summary') {
      if (session) m.push({ ...session.option.coord, id: session.option.id, kind: session.option.kind, label: '' });
    } else if (hereOpt) m.push({ ...hereOpt.coord, id: hereOpt.id, kind: 'here', label: t.hereTitle });
    else options.forEach((o) => m.push({ ...o.coord, id: o.id, kind: o.kind, label: titleOf(o, t) }));
    return m;
  }, [dest, options, step, session, t, hereOpt, tab]);

  const focus = useMemo(() => {
    if ((step === 'active' || step === 'summary') && session) return [session.option.coord];
    if (hereOpt) return [hereOpt.coord];
    if (!dest) return [{ lat: 47.4979, lng: 19.0502 }];
    if (selected && step !== 'options') return [dest, selected.coord];
    return [dest, ...options.map((o) => o.coord)];
  }, [dest, options, selected, step, hereOpt, session]);

  const mapTappable = tab === 'park' && (step === 'search' || (step === 'pay' && !!hereOpt));

  const map = (
    <View style={wide ? { flex: 1 } : { height: tab !== 'park' ? 140 : step === 'search' ? 260 : step === 'options' ? 300 : 200 }}>
      <ParkingMap
        markers={markers}
        selectedId={selectedId}
        onSelect={step === 'options' ? setSelectedId : undefined}
        onMapPress={mapTappable ? pickHere : undefined}
        focus={focus}
      />
    </View>
  );

  const activeLeft = session ? Math.max(0, session.durationMin * 60 - session.elapsedSec) : 0;

  const parkPanel = (
    <>
      {step === 'search' && !hereOpt && (
        <>
          <SearchStep t={t} query={query} setQuery={setQuery} results={results} onPick={pickDest} lang={lang} />
          <View style={[styles.card, { marginTop: 14, gap: 10 }]}>
            <Text style={{ color: C.sub, fontSize: 13 }}>{t.orHere}</Text>
            <Pressable style={styles.navBtn} onPress={useMyLocation}>
              <Text style={styles.navBtnText}>◎ {t.useLocation}</Text>
              <Text style={{ color: C.sub }}>›</Text>
            </Pressable>
            {locMsg && <Text style={{ color: locMsg === t.locating ? C.sub : C.warn, fontSize: 13 }}>{locMsg}</Text>}
          </View>
        </>
      )}

      {step === 'search' && hereOpt && (
        <View>
          <BackLink t={t} onPress={() => setHere(null)} />
          <Text style={styles.h1}>{t.hereTitle}</Text>
          {hereOpt.zone ? (
            <View style={[styles.zonePill, { backgroundColor: `${hereOpt.zone.color}22` }]}>
              <Text style={{ color: hereOpt.zone.color, fontWeight: '800' }}>
                {hereOpt.zone.id} {t.zone} · {hereOpt.zone.pricePerHour} Ft{t.perHour} ·{' '}
                {hereOpt.zone.maxMinutes ? `${t.maxStay} ${formatDuration(hereOpt.zone.maxMinutes, lang)}` : t.noLimit}
              </Text>
            </View>
          ) : (
            <Text style={[styles.sub, { marginTop: 8 }]}>{t.outsideZones}</Text>
          )}
          {hereOpt.zone && !isCharging(hereOpt.zone) && <Text style={[styles.sub, { marginTop: 8 }]}>{t.notCharging}</Text>}
          <Text style={[styles.sub, { marginTop: 8, fontSize: 12 }]}>{t.tapToMove}</Text>
          {hereOpt.zone && (
            <PrimaryButton
              text={t.startHere}
              onPress={() => {
                setDuration(Math.min(120, hereOpt.maxMinutes ?? 120));
                setStep('pay');
              }}
            />
          )}
        </View>
      )}

      {step === 'options' && dest && (
        <View>
          <BackLink t={t} onPress={reset} />
          <Text style={styles.h1}>{lang === 'en' && dest.nameEn ? dest.nameEn : dest.name}</Text>
          <Text style={styles.sub}>
            {dest.address ? `${dest.address} · ` : ''}
            <DestZone dest={dest} t={t} />
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
          cars={cars}
          carId={carId}
          setCarId={setCarId}
          onAddCar={addCar}
          duration={duration}
          setDuration={setDuration}
          payMethod={payMethod}
          setPayMethod={setPayMethod}
          onBack={() => setStep(hereOpt ? 'search' : 'navigate')}
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
            <Row k={t.plate} v={`${session.country} · ${session.plate}`} />
            <Row k={t.zone} v={session.option.zone ? `${session.option.zone.id} ${t.zone}` : '—'} />
            <Row k={t.duration} v={formatDuration(Math.min(session.elapsedSec / 60, session.durationMin), lang)} />
            <Row k={t.charged} v={formatFt(chargeFor(session))} strong />
          </View>
          <PrimaryButton text={t.done} onPress={reset} />
        </View>
      )}
    </>
  );

  const panel = (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
      {banner && tab === 'park' && (
        <View style={[styles.banner, { backgroundColor: banner.kind === 'warn' ? C.warnSoft : C.dangerSoft }]}>
          <Text style={{ color: banner.kind === 'warn' ? C.warn : C.danger, fontWeight: '600' }}>{banner.text}</Text>
        </View>
      )}
      {tab !== 'park' && step === 'active' && session && (
        <Pressable onPress={() => setTab('park')} style={[styles.banner, { backgroundColor: C.brandSoft, flexDirection: 'row', justifyContent: 'space-between' }]}>
          <Text style={{ color: C.brand, fontWeight: '700' }}>
            {t.activeShort} · {formatDuration(Math.ceil(activeLeft / 60), lang)}
          </Text>
          <Text style={{ color: C.brand, fontWeight: '700' }}>{t.open} ›</Text>
        </Pressable>
      )}
      {tab === 'park' && parkPanel}
      {tab === 'history' && <HistoryScreen t={t} lang={lang} items={history} />}
      {tab === 'info' && <InfoScreen t={t} lang={lang} />}
      <Text style={styles.demoNote}>{t.demoBanner}</Text>
    </ScrollView>
  );

  const tabs = (
    <View style={styles.tabBar}>
      {(
        [
          ['park', t.tabPark],
          ['history', t.tabHistory],
          ['info', t.tabInfo],
        ] as [Tab, string][]
      ).map(([k, label]) => (
        <Pressable key={k} onPress={() => setTab(k)} style={[styles.tabBtn, tab === k && styles.tabBtnOn]}>
          <Text style={{ fontWeight: '700', fontSize: 13, color: tab === k ? C.text : C.sub }}>
            {label}
            {k === 'park' && step === 'active' ? ' ●' : ''}
          </Text>
        </Pressable>
      ))}
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['top', 'bottom']}>
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
          <View style={{ width: 440, borderRightWidth: 1, borderColor: C.line, backgroundColor: C.bg }}>
            {tabs}
            {panel}
          </View>
          {map}
        </View>
      ) : (
        <View style={{ flex: 1 }}>
          {map}
          {panel}
          {tabs}
        </View>
      )}
    </SafeAreaView>
  );
}
