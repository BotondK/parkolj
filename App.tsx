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
import { geocode } from './src/logic/geocode';
import { canLocate } from './src/logic/locate';
import { DISTRICT_CENTERS, districtAt, zoneAt } from './src/logic/geo';
import { useLiveLocation } from './src/logic/liveLocation';
import { alertUser, cancelExpiry, requestNotify, scheduleExpiry, SCHEDULES_IN_BACKGROUND } from './src/logic/notify';
import { formatClock, formatDuration, formatFt, isCharging, paidEnd } from './src/logic/pricing';
import { hereOption, recommend, type ParkingOption } from './src/logic/recommend';
import { loadJSON, saveJSON } from './src/logic/storage';
import HistoryScreen from './src/screens/HistoryScreen';
import InfoScreen from './src/screens/InfoScreen';
import Onboarding from './src/screens/Onboarding';
import {
  ActiveStep,
  chargeFor,
  describe,
  DestZone,
  navApps,
  OptionCard,
  PayStep,
  SearchInput,
  SearchStep,
  titleOf,
} from './src/screens/steps';
import type { Car, HistoryItem, Session } from './src/types';
import { useZoneStreets } from './src/logic/loadZoneStreets';
import { remoteExtend, remoteStart, remoteStop } from './src/logic/api';

type Step = 'search' | 'options' | 'navigate' | 'pay' | 'active' | 'summary';
type Tab = 'park' | 'history' | 'info';

const STAY_CHOICES = [30, 60, 120, 180, 240];

const DISTRICT_PLACES: Place[] = DISTRICT_CENTERS.map((d) => ({
  id: `district-${d.name}`,
  name: d.name,
  nameEn: `District ${d.name.split('.')[0]}`,
  address: 'Budapest',
  kind: 'address',
  lat: d.lat,
  lng: d.lng,
}));

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
  const [menuOpen, setMenuOpen] = useState(false);
  const zoneStreets = useZoneStreets();
  const [clock, setClock] = useState(() => formatClock(new Date()));
  useEffect(() => {
    const id = setInterval(() => setClock(formatClock(new Date())), 15000);
    return () => clearInterval(id);
  }, []);
  const [step, setStep] = useState<Step>('search');
  const [query, setQuery] = useState('');
  const [dest, setDest] = useState<Place | null>(null);
  const [here, setHere] = useState<LatLng | null>(null);
  const [locMsg, setLocMsg] = useState<string | null>(null);
  const [stay, setStay] = useState(120);
  const [arriveOffset, setArriveOffset] = useState(0); // perc múlva érkezel
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
  const [onboarded, setOnboarded] = useState(true);

  // --- Helyi tárolás: autók, előzmények, aktív parkolás, nyelv ---
  useEffect(() => {
    (async () => {
      const [c, h, s, l] = await Promise.all([
        loadJSON<Car[] | null>('cars', null),
        loadJSON<HistoryItem[]>('history', []),
        loadJSON<Session | null>('session', null),
        loadJSON<Lang | null>('lang', null),
      ]);
      setOnboarded(await loadJSON<boolean>('onboarded', false));
      if (c && c.length) {
        setCars(c);
        setCarId(c[0].id);
      }
      setHistory(h);
      if (l) setLang(l);
      else {
        // Első indításkor a készülék nyelve alapján: magyar, különben angol (turisták)
        try {
          const loc = Intl.DateTimeFormat().resolvedOptions().locale || '';
          setLang(loc.toLowerCase().startsWith('hu') ? 'hu' : 'en');
        } catch {}
      }
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

  const arriveChoices = useMemo(() => {
    // Most, majd a következő 4 félórás időpont (pl. színházi kezdéshez)
    const now = new Date();
    const first = 30 - (now.getMinutes() % 30);
    return [0, first, first + 30, first + 60, first + 90];
  }, [dest]);
  const options = useMemo(
    () => (dest ? recommend(dest, stay, new Date(Date.now() + arriveOffset * 60000)) : []),
    [dest, stay, arriveOffset],
  );
  const hereOpt = useMemo(() => (here ? hereOption(here, stay) : null), [here, stay]);
  const selected = hereOpt ?? options.find((o) => o.id === selectedId) ?? null;

  useEffect(() => {
    if (options.length && !options.some((o) => o.id === selectedId)) setSelectedId(options[0].id);
  }, [options, selectedId]);

  const [remote, setRemote] = useState<Place[]>([]);
  useEffect(() => {
    // Valódi címkeresés 3+ karaktertől, 400 ms késleltetéssel; ha nem elérhető, marad a helyi lista
    setRemote([]);
    if (query.trim().length < 3) return;
    const ctrl = new AbortController();
    const id = setTimeout(() => geocode(query.trim(), ctrl.signal).then(setRemote), 400);
    return () => {
      clearTimeout(id);
      ctrl.abort();
    };
  }, [query]);
  const results = useMemo(() => {
    const local = searchPlaces(query, DISTRICT_PLACES);
    const far = remote.filter((r) => !local.some((l) => Math.abs(l.lat - r.lat) < 0.0015 && Math.abs(l.lng - r.lng) < 0.0015));
    return [...local, ...far].slice(0, 10);
  }, [query, remote]);

  const pickDest = (p: Place) => {
    setHere(null);
    setDest(p);
    setArriveOffset(0);
    setSelectedId(null);
    setStep('options');
  };

  const pickHere = useCallback((pt: LatLng) => {
    setDest(null);
    setLocMsg(null);
    setHere(pt);
  }, []);

  // --- Élő GPS ---
  const live = useLiveLocation();
  const [hereFromGps, setHereFromGps] = useState(false);
  const [firstFix, setFirstFix] = useState<LatLng | null>(null);
  useEffect(() => {
    if (live.fix && !firstFix) setFirstFix({ lat: live.fix.lat, lng: live.fix.lng });
    if (live.fix && hereFromGps) {
      setHereFromGps(false);
      pickHere(live.fix);
    }
  }, [live.fix, hereFromGps, firstFix, pickHere]);
  useEffect(() => {
    if (live.status === 'asking') setLocMsg(t.locating);
    else if (live.status === 'denied') setLocMsg(t.locationDenied);
    else if (live.status === 'unavailable' && hereFromGps) setLocMsg(t.locationFailed);
    else if (live.status === 'on') setLocMsg(live.fix ? null : t.locating);
  }, [live.status, live.fix, hereFromGps, t]);

  const useMyLocation = () => {
    if (live.fix) pickHere(live.fix);
    else {
      setHereFromGps(true);
      live.start();
    }
  };
  const meZone = live.fix ? zoneAt(live.fix) : null;
  const meDistrict = live.fix ? districtAt(live.fix) : null;

  // --- Aktív parkolás óra ---
  const speedRef = useRef(demoSpeed);
  speedRef.current = demoSpeed;
  useEffect(() => {
    if (step !== 'active') return;
    const id = setInterval(() => {
      setSession((s) => {
        if (!s) return s;
        // Valós időben a tényleges eltelt időből számol (újranyitás után is pontos), demóban gyorsítva
        const real = Math.floor((Date.now() - s.startedAt) / 1000);
        return { ...s, elapsedSec: speedRef.current ? s.elapsedSec + 60 : Math.max(s.elapsedSec + 1, real) };
      });
    }, 1000);
    return () => clearInterval(id);
  }, [step]);

  useEffect(() => {
    if (!session || step !== 'active') return;
    const z = session.option.zone;
    const pe = z ? paidEnd(z, new Date(session.startedAt)) : null;
    if (pe && session.startedAt + session.elapsedSec * 1000 >= pe.getTime()) {
      stopSession();
      setBanner({ kind: 'warn', text: t.autoStopped(formatClock(pe)) });
      return;
    }
    const left = session.durationMin * 60 - session.elapsedSec;
    if (left <= 600 && left > 0 && !session.warnedSoon) {
      setBanner({ kind: 'warn', text: t.alertSoon });
      if (!(SCHEDULES_IN_BACKGROUND && !demoSpeed)) alertUser(t.appName, t.alertSoon);
      setSession({ ...session, warnedSoon: true });
    } else if (left <= 0 && !session.warnedExpired) {
      setBanner({
        kind: 'danger',
        text: t.alertExpired + (z ? t.expiredFine(formatFt(z.surcharge[0])) : ''),
      });
      if (!(SCHEDULES_IN_BACKGROUND && !demoSpeed)) alertUser(t.appName, t.alertExpired);
      setSession({ ...session, warnedExpired: true });
    }
  }, [session, step, t, demoSpeed]);

  // Valós idejű parkolásnál a telefon előre ütemezi a lejárati értesítéseket (bezárt appnál is szól)
  const endAt = session ? session.startedAt + session.durationMin * 60000 : 0;
  useEffect(() => {
    if (step !== 'active' || !session || demoSpeed) {
      cancelExpiry();
      return;
    }
    const z = session.option.zone;
    const pe = z ? paidEnd(z, new Date(session.startedAt)) : null;
    const end = pe ? Math.min(pe.getTime(), endAt) : endAt;
    scheduleExpiry(end, t.alertSoon, t.alertExpired, t.appName);
  }, [step, endAt, demoSpeed, t]);

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
    if (selected.zone && selected.kind !== 'garage') {
      const startedAt = Date.now();
      remoteStart({ coord: selected.coord, plate: car.plate, country: car.country, minutes: duration }).then((id) => {
        if (id) setSession((cur) => (cur && cur.startedAt <= startedAt + 5000 ? { ...cur, remoteId: id } : cur));
      });
    }
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
    if (session.remoteId) remoteExtend(session.remoteId, 15);
  };

  const stopSession = () => {
    if (session?.remoteId) remoteStop(session.remoteId);
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
    if (!dest && firstFix) return [firstFix]; // első GPS-helyzetre egyszer rááll
    if (!dest) return [{ lat: 47.475, lng: 19.0 }, { lat: 47.535, lng: 19.11 }]; // belső kerületek
    if (selected && step !== 'options') return [dest, selected.coord];
    return [dest, ...options.map((o) => o.coord)];
  }, [dest, options, selected, step, hereOpt, session, firstFix]);

  const mapTappable = tab === 'park' && (step === 'search' || (step === 'pay' && !!hereOpt));

  const map = (
    <View style={{ flex: 1 }}>
      <ParkingMap
        markers={markers}
        selectedId={selectedId}
        onSelect={step === 'options' ? setSelectedId : undefined}
        onMapPress={mapTappable ? pickHere : undefined}
        focus={focus}
        me={live.fix}
        onLocate={live.status === 'unavailable' ? undefined : live.start}
        controlsTop={!wide}
        zoneStreets={zoneStreets}
      />
      <View style={{ position: 'absolute', top: wide ? 24 : 12, right: wide ? 24 : 12, zIndex: 1100 }}>
        <Pressable style={styles.pill} onPress={() => setMenuOpen((o) => !o)} accessibilityLabel="Menü">
          <Text style={{ fontSize: 26, fontWeight: '800', color: C.text, fontVariant: ['tabular-nums'] }}>{clock}</Text>
          <View style={{ gap: 5 }}>
            {[0, 1, 2].map((i) => (
              <View key={i} style={{ width: 24, height: 3, borderRadius: 2, backgroundColor: C.brand }} />
            ))}
          </View>
        </Pressable>
        {menuOpen && (
          <View style={styles.menu}>
            {(
              [
                ['park', t.tabPark],
                ['history', t.tabHistory],
                ['info', t.tabInfo],
              ] as [Tab, string][]
            ).map(([k, label]) => (
              <Pressable key={k} style={styles.menuItem} onPress={() => { setTab(k); setMenuOpen(false); }}>
                <Text style={{ fontSize: 16, fontWeight: tab === k ? '800' : '500', color: tab === k ? C.brand : C.text }}>{label}</Text>
                {k === 'park' && step === 'active' && <Text style={{ color: C.brand }}>●</Text>}
              </Pressable>
            ))}
            <View style={{ height: 1, backgroundColor: C.line, marginVertical: 6 }} />
            <View style={[styles.menuItem, { gap: 8, justifyContent: 'flex-start' }]}>
              {(['hu', 'en'] as Lang[]).map((l) => (
                <Pressable key={l} onPress={() => setLang(l)} style={[styles.chip, { paddingVertical: 6 }, lang === l && styles.chipOn]}>
                  <Text style={{ fontWeight: '700', color: lang === l ? '#fff' : C.text }}>{l === 'hu' ? 'Magyar' : 'English'}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}
      </View>
    </View>
  );

  const activeLeft = session ? Math.max(0, session.durationMin * 60 - session.elapsedSec) : 0;

  const parkPanel = (
    <>
      {step === 'search' && !hereOpt && (
        <>
          {live.fix && (
            <View style={[styles.card, { marginBottom: 14, gap: 4, borderColor: '#BFDBFE' }]}>
              <Text style={{ color: '#2563EB', fontWeight: '700', fontSize: 13 }}>● {t.youAreHere}</Text>
              <Text style={{ color: C.text, fontWeight: '700', fontSize: 16 }}>
                {meDistrict ?? 'Budapest'}
                {meZone ? ` · ${meZone.id} ${t.zone} · ${meZone.pricePerHour} Ft${t.perHour}` : ` · ${t.outsideZones}`}
              </Text>
              <Text style={{ color: C.sub, fontSize: 12 }}>
                ±{Math.round(live.fix.accuracy)} m{meZone && !isCharging(meZone) ? ` · ${t.free}` : ''}
              </Text>
              {meZone && <PrimaryButton text={t.startHere} onPress={useMyLocation} />}
            </View>
          )}
          <SearchStep t={t} query={query} setQuery={setQuery} results={results} onPick={pickDest} lang={lang} hideInput={wide} />
          <View style={[styles.card, { marginTop: 14, gap: 10 }]}>
            <Text style={{ color: C.sub, fontSize: 13 }}>{canLocate() ? t.orHere : t.tapMap}</Text>
            {canLocate() && !live.fix && (
              <Pressable style={styles.navBtn} onPress={useMyLocation}>
                <Text style={styles.navBtnText}>◎ {t.useLocation}</Text>
                <Text style={{ color: C.sub }}>›</Text>
              </Pressable>
            )}
            {locMsg && <Text style={{ color: locMsg === t.locating ? C.sub : C.warn, fontSize: 13 }}>{locMsg}</Text>}
          </View>
        </>
      )}

      {step === 'search' && hereOpt && (
        <View>
          <BackLink t={t} onPress={() => setHere(null)} />
          <Text style={styles.h1}>{t.hereTitle}</Text>
          {districtAt(hereOpt.coord) && <Text style={styles.sub}>{districtAt(hereOpt.coord)}</Text>}
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

          <Text style={styles.label}>{t.arriveAt}</Text>
          <View style={styles.chipRow}>
            {arriveChoices.map((m) => (
              <Chip
                key={m}
                active={arriveOffset === m}
                onPress={() => setArriveOffset(m)}
                text={m === 0 ? t.now : formatClock(new Date(Date.now() + m * 60000 - (Date.now() % 60000)))}
              />
            ))}
          </View>

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
            <Row k={t.zone.charAt(0).toUpperCase() + t.zone.slice(1)} v={session.option.zone ? `${session.option.zone.id} ${t.zone}` : '—'} />
            <Row k={t.duration} v={formatDuration(Math.min(session.elapsedSec / 60, session.durationMin), lang)} />
            <Row k={t.charged} v={formatFt(chargeFor(session))} strong />
          </View>
          <PrimaryButton text={t.done} onPress={reset} />
        </View>
      )}
    </>
  );

  const tabTitle = tab === 'park' ? t.tabPark : tab === 'history' ? t.tabHistory : t.tabInfo;
  const sideTop = (
    <View style={styles.sideTop}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <View style={styles.brandMark}>
          <Text style={{ color: C.brand, fontWeight: '900', fontSize: 13 }}>P</Text>
        </View>
        <Text style={{ fontSize: 22, letterSpacing: 2, color: C.brand }}>
          PARK<Text style={{ fontWeight: '900' }}>OLJ</Text>
        </Text>
        <Text style={{ color: C.sub, fontSize: 12, flex: 1, textAlign: 'right' }}>{t.tagline}</Text>
      </View>
      <SearchInput
        t={t}
        query={query}
        setQuery={setQuery}
        onFocus={() => {
          if (tab !== 'park') setTab('park');
          if (step !== 'search' && step !== 'active') reset();
        }}
      />
      <View style={styles.sideTitleRow}>
        <Text style={[styles.sideTitle, { color: C.brand }]}>{tabTitle}</Text>
        {(tab !== 'park' || (step !== 'search' && step !== 'active') || hereOpt) && (
          <Pressable onPress={() => (tab !== 'park' ? setTab('park') : reset())} accessibilityLabel={t.back}>
            <Text style={styles.closeX}>✕</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
  const panel = (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: wide ? 28 : 16, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
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

  if (!loaded) return <View style={{ flex: 1, backgroundColor: C.bg }} />;
  if (!onboarded)
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
        <Onboarding
          t={t}
          lang={lang}
          setLang={setLang}
          onDone={() => {
            setOnboarded(true);
            saveJSON('onboarded', true);
          }}
        />
      </SafeAreaView>
    );

  const sheetH = tab !== 'park' ? '78%' : step === 'search' && !hereOpt ? '52%' : step === 'options' ? '60%' : '66%';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={wide ? ['top', 'bottom'] : ['top']}>
      <StatusBar style="dark" />
      {wide ? (
        <View style={{ flex: 1, flexDirection: 'row' }}>
          <View style={{ width: 460, backgroundColor: C.bg }}>
            {sideTop}
            {panel}
          </View>
          {map}
        </View>
      ) : (
        <View style={{ flex: 1 }}>
          {map}
          <View style={[styles.sheet, { height: sheetH }]}>
            <View style={styles.grabber} />
            {panel}
            <SafeAreaView edges={['bottom']} style={{ backgroundColor: C.card }}>
              {tabs}
            </SafeAreaView>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}
