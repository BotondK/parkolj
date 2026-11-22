import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, Linking, Platform, Pressable, ScrollView, Text, TextInput, useColorScheme, useWindowDimensions, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import ParkingMap from './src/components/ParkingMap';
import type { MapMarker } from './src/components/mapTypes';
import { Icon, type IconName } from './src/components/icons';
import { ListRow, Section, titleColor } from './src/components/kit';
import { applyTheme, BackLink, C, Chip, isDark, PrimaryButton, Row, styles, zoneText } from './src/components/ui';
import type { Place } from './src/data/places';
import type { LatLng } from './src/data/zones';
import { STRINGS, type Lang } from './src/i18n';
import { ACC, DEMO_COUPONS } from './src/i18nAccount';
import { canLocate } from './src/logic/locate';
import { districtAt, zoneAt } from './src/logic/geo';
import { useLiveLocation } from './src/logic/liveLocation';
import { alertUser, cancelExpiry, requestNotify, scheduleExpiry, SCHEDULES_IN_BACKGROUND } from './src/logic/notify';
import { formatClock, formatDuration, formatFt, isCharging, paidEnd, priceWindow } from './src/logic/pricing';
import { hereOption, recommend, type ParkingOption } from './src/logic/recommend';
import { loadJSON, saveJSON } from './src/logic/storage';
import { BIOMETRIC_AVAILABLE, confirmBiometric } from './src/logic/biometric';
import { usePlaceSearch } from './src/logic/usePlaceSearch';
import FavoritesScreen from './src/screens/FavoritesScreen';
import MenuScreens, { cardLabel, profileLabel, walletLabel, type MenuPage } from './src/screens/MenuScreens';
import ParkingsScreen from './src/screens/ParkingsScreen';
import { PlusActivePanel, PlusOnPay } from './src/screens/PlusScreens';
import CityScreen from './src/screens/CityScreen';
import Onboarding from './src/screens/Onboarding';
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
import {
  AUTO_EXT_STEP_MIN,
  DEFAULT_SETTINGS,
  PLUS_ONCE_FT,
  shouldAutoExtend,
  type Account,
  type AppNote,
  type BillingProfile,
  type Car,
  type FavoritePlace,
  type HistoryItem,
  type PaymentCard,
  type Session,
  type Settings,
} from './src/types';
import { useZoneStreets } from './src/logic/loadZoneStreets';
import { remoteExtend, remoteStart, remoteStop } from './src/logic/api';
import { cloud, freshSession, mergeData, type AuthSession, type CloudData, type Feedback } from './src/logic/cloud';

type Step = 'search' | 'options' | 'navigate' | 'pay' | 'active' | 'summary';
type Tab = 'park' | 'fav' | 'parkings' | 'menu';

const STAY_CHOICES = [30, 60, 120, 180, 240];


const CITY_PAGE = Platform.OS === 'web' && typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('varos');

export default function App() {
  return (
    <SafeAreaProvider>
      {CITY_PAGE ? <CityScreen /> : <Main />}
    </SafeAreaProvider>
  );
}

function Main() {
  const [lang, setLang] = useState<Lang>('hu');
  const t = STRINGS[lang];
  const a = ACC[lang];
  const { width } = useWindowDimensions();
  const wide = width >= 900;

  const [tab, setTabRaw] = useState<Tab>('park');
  const [menuPage, setMenuPage] = useState<MenuPage>('home');
  const setTab = (k: Tab) => {
    if (k === 'menu' && tab === 'menu') setMenuPage('home');
    setTabRaw(k);
  };
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
  const [payMethod, setPayMethod] = useState('wallet');
  const [profileId, setProfileId] = useState('none');
  // Fiók, kedvencek, fizetés, értesítések, beállítások (helyben tárolva)
  const [favorites, setFavorites] = useState<FavoritePlace[]>([]);
  const [cards, setCards] = useState<PaymentCard[]>([]);
  const [profiles, setProfiles] = useState<BillingProfile[]>([]);
  const [notes, setNotes] = useState<AppNote[]>([]);
  const [account, setAccount] = useState<Account>(null);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [credit, setCredit] = useState(0);
  const [usedCoupons, setUsedCoupons] = useState<string[]>([]);
  const [saveOpen, setSaveOpen] = useState(false);
  const [plusOnce, setPlusOnce] = useState(false);
  const [authSession, setAuthSession] = useState<AuthSession | null>(null);
  const [sync, setSync] = useState<'off' | 'saving' | 'saved' | 'error'>('off');
  const patchSettings = (p: Partial<Settings>) => setSettings((s) => ({ ...s, ...p }));
  const addNote = (title: string, body: string) =>
    setNotes((n) => [{ id: `${Date.now()}-${n.length}`, at: Date.now(), title, body }, ...n].slice(0, 50));

  // --- Sötét / világos mód (rendszer szerint vagy kézzel) ---
  const sysScheme = useColorScheme();
  const dark = settings.theme === 'dark' || (settings.theme === 'system' && sysScheme === 'dark');
  if (isDark !== dark) applyTheme(dark);
  const [session, setSession] = useState<Session | null>(null);
  const [demoSpeed, setDemoSpeed] = useState(true);
  const [banner, setBanner] = useState<{ kind: 'warn' | 'danger' | 'good'; text: string } | null>(null);
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
      const [fv, cd, pr, nt, ac, st, cr, uc, dc] = await Promise.all([
        loadJSON<FavoritePlace[]>('favorites', []),
        loadJSON<PaymentCard[]>('cards', []),
        loadJSON<BillingProfile[]>('profiles', []),
        loadJSON<AppNote[]>('notes', []),
        loadJSON<Account>('account', null),
        loadJSON<Partial<Settings>>('settings', {}),
        loadJSON<number>('credit', 0),
        loadJSON<string[]>('coupons', []),
        loadJSON<string | null>('defaultCar', null),
      ]);
      setFavorites(fv);
      setCards(cd);
      setProfiles(pr);
      setNotes(nt);
      setAccount(ac);
      setSettings({ ...DEFAULT_SETTINGS, ...st });
      setCredit(cr);
      setUsedCoupons(uc);
      if (cloud) setAuthSession(await loadJSON<AuthSession | null>('auth', null));
      setOnboarded(await loadJSON<boolean>('onboarded', false));
      if (c) {
        setCars(c);
        setCarId(c.find((x) => x.id === dc)?.id ?? c[0]?.id ?? null);
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
    if (!loaded) return;
    saveJSON('favorites', favorites);
    saveJSON('cards', cards);
    saveJSON('profiles', profiles);
    saveJSON('notes', notes);
    saveJSON('account', account);
    saveJSON('settings', settings);
    saveJSON('credit', credit);
    saveJSON('coupons', usedCoupons);
    saveJSON('defaultCar', carId);
  }, [favorites, cards, profiles, notes, account, settings, credit, usedCoupons, carId, loaded]);

  // --- Felhős fiók (Supabase): belépés kóddal, adatok szinkronja minden eszközre ---
  const authRef = useRef(authSession);
  // Csak a felhőből való első letöltés után mentünk, különben egy régi helyi állapot felülírná a másik eszköz változásait
  const [pulled, setPulled] = useState(false);
  const [pullTick, setPullTick] = useState(0);
  authRef.current = authSession;
  // Aktív parkolás szinkronja: mikor változott utoljára (indítás, hosszabbítás, leállítás)
  const activeNow = step === 'active' && session ? session : null;
  const activeKey = activeNow ? `${activeNow.startedAt}:${activeNow.durationMin}` : 'none';
  const [activeAt, setActiveAt] = useState(0);
  const lastKey = useRef<string | null>(null);
  useEffect(() => {
    if (!loaded) return;
    if (lastKey.current === null) {
      lastKey.current = activeKey;
      loadJSON<number>('activeAt', 0).then(setActiveAt);
      return;
    }
    if (lastKey.current !== activeKey) {
      lastKey.current = activeKey;
      const at = Date.now();
      setActiveAt(at);
      saveJSON('activeAt', at);
    }
  }, [activeKey, loaded]);
  const cloudData = (): CloudData => ({
    name: account?.name,
    cars,
    favorites,
    cards,
    profiles,
    history,
    settings,
    active: { s: activeNow ? { ...activeNow, elapsedSec: 0 } : null, at: activeAt },
  });
  const applyData = (d: CloudData) => {
    if (d.cars) {
      setCars(d.cars);
      setCarId((id) => (d.cars!.some((c) => c.id === id) ? id : d.cars![0]?.id ?? null));
    }
    if (d.favorites) setFavorites(d.favorites);
    if (d.cards) setCards(d.cards);
    if (d.profiles) setProfiles(d.profiles);
    if (d.history) setHistory(d.history);
    if (d.settings) setSettings((s) => ({ ...s, ...d.settings }));
    // Másik eszközön indított / leállított parkolás átvétele
    if (d.active && d.active.at > activeAt) {
      const r = d.active.s;
      lastKey.current = r ? `${r.startedAt}:${r.durationMin}` : 'none';
      setActiveAt(d.active.at);
      saveJSON('activeAt', d.active.at);
      if (r) {
        setSession({ ...r, elapsedSec: Math.max(0, Math.floor((Date.now() - r.startedAt) / 1000)) });
        setStep('active');
      } else if (step === 'active') {
        setSession(null);
        setStep('search');
      }
    }
  };
  const withToken = async () => {
    const s0 = authRef.current;
    if (!cloud || !s0) return null;
    const s = await freshSession(cloud, s0);
    if (s !== s0) {
      setAuthSession(s);
      saveJSON('auth', s);
    }
    return s;
  };
  // Indításkor (ha be van lépve) a felhőből frissít
  useEffect(() => {
    if (!loaded || !cloud || !authSession) return;
    (async () => {
      try {
        const s = await withToken();
        if (!s) return;
        const remote = await cloud!.load(s);
        if (remote) applyData(mergeData(cloudData(), remote));
        setPulled(true);
        setSync('saved');
      } catch {
        setSync('error');
      }
    })();
  }, [loaded, !!authSession, pullTick]);
  // Amikor visszaváltasz az appra (másik lapról / háttérből), frissít a fiókból
  useEffect(() => {
    const sub = AppState.addEventListener('change', (st) => st === 'active' && setPullTick((n) => n + 1));
    return () => sub.remove();
  }, []);
  // Változáskor 1,5 mp késleltetéssel menti a fiókba
  useEffect(() => {
    if (!loaded || !cloud || !authSession || !pulled) return;
    setSync('saving');
    const id = setTimeout(async () => {
      try {
        const s = await withToken();
        if (s) await cloud!.save(s, cloudData());
        setSync('saved');
      } catch {
        setSync('error');
      }
    }, 1500);
    return () => clearTimeout(id);
  }, [cars, favorites, cards, profiles, history, settings, account?.name, loaded, !!authSession, pulled, activeAt]);

  // Visszajelzés: ha nincs kapcsolat vagy fiókszerver, sorba kerül, és később megy el
  const flushFeedback = async (extra: Feedback[] = []) => {
    const queue = [...(await loadJSON<Feedback[]>('feedbackQueue', [])), ...extra];
    if (!queue.length) return true;
    const left: Feedback[] = [];
    for (const fb of queue) {
      try {
        if (!cloud) throw new Error('no cloud');
        await cloud.sendFeedback(fb, await withToken().catch(() => null));
      } catch {
        left.push(fb);
      }
    }
    await saveJSON('feedbackQueue', left);
    return left.length === 0;
  };
  useEffect(() => {
    if (loaded && cloud) flushFeedback();
  }, [loaded]);
  const sendFeedback = (rating: number | null, message: string) =>
    flushFeedback([
      { at: Date.now(), rating, message, meta: { version: '0.3', platform: Platform.OS, lang, width: String(Math.round(width)), theme: dark ? 'dark' : 'light' } },
    ]);

  const finishLogin = async (s: AuthSession, name: string) => {
    const remote = await cloud!.load(s);
    const merged = mergeData({ ...cloudData(), name: name || undefined }, remote);
    applyData(merged);
    setAccount({ name: merged.name || s.email.split('@')[0], email: s.email });
    saveJSON('auth', s);
    setPulled(true);
    setAuthSession(s);
  };
  // Weben: visszatérés a belépő linkről (…/parkolj/#access_token=…)
  useEffect(() => {
    if (!loaded || !cloud || Platform.OS !== 'web' || typeof window === 'undefined') return;
    const hash = window.location.hash;
    if (!/access_token=|error=/.test(hash)) return;
    window.history.replaceState(null, '', window.location.pathname + window.location.search);
    (async () => {
      try {
        const r = await cloud!.sessionFromUrl(hash);
        if (!r) return;
        if ('error' in r) throw new Error(r.error);
        await finishLogin(r, await loadJSON<string>('pendingName', ''));
        saveJSON('pendingName', '');
        setBanner({ kind: 'good', text: a.loggedIn(r.email) });
      } catch {
        setBanner({ kind: 'danger', text: a.linkFailed });
      }
    })();
  }, [loaded]);

  const auth = {
    cloud: !!cloud,
    sync: authSession ? sync : ('off' as const),
    sendCode: async (email: string, name: string) => {
      try {
        saveJSON('pendingName', name);
        const back = Platform.OS === 'web' && typeof window !== 'undefined' ? window.location.origin + window.location.pathname : undefined;
        await cloud!.sendCode(email, back);
        return null;
      } catch (e) {
        return e instanceof Error ? e.message : String(e);
      }
    },
    verify: async (email: string, code: string, name: string) => {
      try {
        await finishLogin(await cloud!.verifyCode(email, code), name);
        return true;
      } catch {
        return false;
      }
    },
    logout: () => {
      if (authSession) cloud?.signOut(authSession);
      setAuthSession(null);
      saveJSON('auth', null);
      setAccount(null);
      setPulled(false);
      setSync('off');
    },
  };
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

  const results = usePlaceSearch(query);

  const pickDest = (p: Place) => {
    setHere(null);
    setDest(p);
    setArriveOffset(0);
    setSelectedId(null);
    setSaveOpen(false);
    setTab('park');
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
      addNote(a.noteAuto, t.autoStopped(formatClock(pe)));
      return;
    }
    // Plusz: automatikus hosszabbítás lejárat előtt 2 perccel (3 órás szabály és keret betartva)
    const sessionPlus = settings.plus === 'monthly' || !!session.plusOnce;
    if (sessionPlus && settings.autoExtend && shouldAutoExtend(session, settings.autoExtendMax, z?.maxMinutes)) {
      const durationMin = session.durationMin + AUTO_EXT_STEP_MIN;
      const end = formatClock(new Date(session.startedAt + durationMin * 60000));
      setSession({ ...session, durationMin, autoExtMin: (session.autoExtMin ?? 0) + AUTO_EXT_STEP_MIN, warnedSoon: false, warnedExpired: false });
      if (session.remoteId) remoteExtend(session.remoteId, AUTO_EXT_STEP_MIN);
      setBanner({ kind: 'good', text: a.autoExtended(end) });
      addNote(a.autoExtendedNote, a.autoExtended(end));
      return;
    }
    const left = session.durationMin * 60 - session.elapsedSec;
    const soonText = a.soonIn(settings.remindMin);
    if (settings.remind && left <= settings.remindMin * 60 && left > 0 && !session.warnedSoon) {
      setBanner({ kind: 'warn', text: soonText });
      if (!(SCHEDULES_IN_BACKGROUND && !demoSpeed)) alertUser(t.appName, soonText);
      addNote(a.noteSoon, soonText);
      setSession({ ...session, warnedSoon: true });
    } else if (left <= 0 && !session.warnedExpired) {
      setBanner({
        kind: 'danger',
        text: t.alertExpired + (z ? t.expiredFine(formatFt(z.surcharge[0])) : ''),
      });
      if (!(SCHEDULES_IN_BACKGROUND && !demoSpeed)) alertUser(t.appName, t.alertExpired);
      addNote(a.noteExpired, t.alertExpired);
      setSession({ ...session, warnedExpired: true });
    }
  }, [session, step, t, a, demoSpeed, settings.remind, settings.remindMin, settings.plus, settings.autoExtend, settings.autoExtendMax]);

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
    // Kikapcsolt emlékeztetőnél csak a lejáratkor szól (a „hamarosan” időpont a múltba kerül, kimarad)
    scheduleExpiry(end, a.soonIn(settings.remindMin), t.alertExpired, t.appName, settings.remind ? settings.remindMin : 100000);
  }, [step, endAt, demoSpeed, t, a, settings.remind, settings.remindMin]);

  // Fizetési lépésnél az alapértelmezett kártya és számlázási profil
  const payOptions = useMemo(() => [{ id: 'wallet', label: walletLabel(a) }, ...cards.map((c) => ({ id: c.id, label: cardLabel(c) }))], [cards, a]);
  const profileOptions = useMemo(() => [{ id: 'none', label: a.noProfile }, ...profiles.map((p) => ({ id: p.id, label: profileLabel(p, a) }))], [profiles, a]);
  useEffect(() => {
    if (step !== 'pay') return;
    setPayMethod(payOptions.some((o) => o.id === settings.defaultPay) ? settings.defaultPay : 'wallet');
    setProfileId(profileOptions.some((o) => o.id === settings.defaultProfile) ? settings.defaultProfile : 'none');
  }, [step]);

  const startSession = async () => {
    const car = cars.find((c) => c.id === carId);
    if (!selected || !car) return;
    const est = selected.zone ? priceWindow(selected.zone, new Date(), duration) : 0;
    if (settings.biometric && BIOMETRIC_AVAILABLE && est - Math.min(credit, est) >= settings.biometricOver) {
      if (!(await confirmBiometric(a.biometricPrompt))) {
        setBanner({ kind: 'danger', text: a.biometricFailed });
        return;
      }
    }
    requestNotify();
    setBanner(null);
    const payLabel = payOptions.find((o) => o.id === payMethod)?.label;
    const profLabel = profileId === 'none' ? undefined : profileOptions.find((o) => o.id === profileId)?.label;
    const endTxt = formatClock(new Date(Date.now() + duration * 60000));
    addNote(a.noteStartTitle, a.noteStarted(selected.zone ? `${selected.zone.id} ${t.zone}, ${car.plate}` : car.plate, endTxt));
    setSession({
      payLabel,
      profileLabel: profLabel,
      plusOnce: settings.plus !== 'monthly' && plusOnce,
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
      const gross = chargeFor(session);
      const used = Math.min(credit, gross);
      if (used) setCredit((c) => c - used);
      addNote(a.noteStopTitle, a.noteStopped(formatFt(gross - used)));
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
          cost: gross - used,
          credit: used || undefined,
          payLabel: session.payLabel,
          profileLabel: session.profileLabel,
          plusFee: session.plusOnce ? PLUS_ONCE_FT : undefined,
          spot: session.spot,
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
  const removeCar = (id: string) => {
    const rest = cars.filter((c) => c.id !== id);
    setCars(rest);
    if (carId === id) setCarId(rest[0]?.id ?? null);
  };

  const redeemCoupon = (code: string) => {
    const v = DEMO_COUPONS[code.toUpperCase()];
    if (!v || usedCoupons.includes(code.toUpperCase())) return null;
    setUsedCoupons((u) => [...u, code.toUpperCase()]);
    setCredit((c) => c + v);
    return v;
  };

  const saveFavorite = (slot: FavoritePlace['slot']) => {
    if (!dest) return;
    const name = lang === 'en' && dest.nameEn ? dest.nameEn : dest.name;
    const fav: FavoritePlace = {
      id: slot === 'custom' ? `${Date.now()}` : slot,
      slot,
      label: slot === 'home' ? a.home : slot === 'work' ? a.work : name,
      name,
      address: dest.address,
      lat: dest.lat,
      lng: dest.lng,
    };
    setFavorites((f) => [...f.filter((x) => x.slot === 'custom' ? !(Math.abs(x.lat - fav.lat) < 1e-5 && Math.abs(x.lng - fav.lng) < 1e-5) : x.slot !== slot), fav]);
    setSaveOpen(false);
    setBanner({ kind: 'good', text: a.saved });
  };
  const destSaved = !!dest && favorites.some((f) => Math.abs(f.lat - dest.lat) < 1e-5 && Math.abs(f.lng - dest.lng) < 1e-5);
  const goFavorite = (slot: 'home' | 'work') => {
    const f = favorites.find((x) => x.slot === slot);
    if (f) pickDest({ id: `fav-${f.id}`, name: f.name, address: f.address, kind: 'address', lat: f.lat, lng: f.lng });
    else setTab('fav');
  };

  const openPlus = () => {
    setMenuPage('plus');
    setTab('menu');
  };

  const wipe = () => {
    if (cloud && authSession) {
      withToken().then((s) => s && cloud!.deleteAccount(s)).catch(() => {});
      setAuthSession(null);
      saveJSON('auth', null);
    }
    setFavorites([]);
    setCards([]);
    setProfiles([]);
    setNotes([]);
    setAccount(null);
    setSettings(DEFAULT_SETTINGS);
    setCredit(0);
    setUsedCoupons([]);
    setHistory([]);
    setCars([]);
    setCarId(null);
    setSession(null);
    setStep('search');
    setMenuPage('home');
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

  // Lépés- vagy fülváltáskor a panel tetejére ugrik
  const scrollRef = useRef<{ scrollTo: (o: { y: number; animated: boolean }) => void } | null>(null);
  useEffect(() => {
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  }, [step, tab, menuPage, !!hereOpt]);

  const searchFocus = () => {
    if (tab !== 'park') setTab('park');
    if (step !== 'search' && step !== 'active') reset();
  };

  // Kereső „pirula”: telefonon a térkép tetején, asztalin a bal panel tetején (mint a BudapestGO-ban)
  const searchPill = (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        height: 56,
        borderRadius: 30,
        backgroundColor: C.searchPill,
        borderWidth: isDark ? 0 : 1.5,
        borderColor: C.brand,
        paddingLeft: 16,
        paddingRight: 8,
        gap: 10,
        shadowColor: '#000',
        shadowOpacity: 0.16,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 2 },
        elevation: 4,
      }}
    >
      <Icon name="search" size={24} color={C.text} />
      <TextInput
        value={query}
        onChangeText={setQuery}
        onFocus={searchFocus}
        placeholder={a.whereTo}
        placeholderTextColor={C.sub}
        autoCorrect={false}
        style={[{ flex: 1, minWidth: 0, height: 52, fontSize: 17, color: C.text }, { outlineStyle: 'none' } as object]}
      />
      {query ? (
        <Pressable onPress={() => setQuery('')} hitSlop={8} style={{ padding: 8 }} role="button" accessibilityLabel={a.cancel}>
          <Icon name="close" size={22} color={C.sub} />
        </Pressable>
      ) : (
        (['home', 'work'] as const).map((k) => (
          <Pressable key={k} onPress={() => goFavorite(k)} hitSlop={6} style={{ padding: 8 }} role="button" accessibilityLabel={k === 'home' ? a.home : a.work}>
            <Icon name={k} size={24} color={isDark ? C.text : C.brand} />
          </Pressable>
        ))
      )}
    </View>
  );

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
        dark={dark}
      />
      {wide ? (
        <View style={{ position: 'absolute', top: 24, right: 24, zIndex: 1100 }}>
          {/* Csak az óra: a menü a bal oldali sávban, az alsó fülsorból nyílik */}
          <View style={[styles.pill, { paddingRight: 20 }]}>
            <Text style={{ fontSize: 26, fontWeight: '800', color: C.text, fontVariant: ['tabular-nums'] }}>{clock}</Text>
          </View>
        </View>
      ) : (
        <View style={{ position: 'absolute', top: 12, left: 12, right: 12, zIndex: 1100 }}>{searchPill}</View>
      )}
    </View>
  );

  const activeLeft = session ? Math.max(0, session.durationMin * 60 - session.elapsedSec) : 0;

  const parkPanel = (
    <>
      {step === 'search' && !hereOpt && (
        <>
          {live.fix && (
            <View style={[styles.card, { marginBottom: 14, gap: 4, borderColor: isDark ? C.line : '#BFDBFE' }]}>
              <Text style={{ color: isDark ? '#93C5FD' : '#2563EB', fontWeight: '700', fontSize: 13 }}>● {t.youAreHere}</Text>
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
          {meDistrict && !query && <Text style={[styles.h1, { fontSize: 24, color: titleColor(), marginBottom: 4 }]}>{a.near(meDistrict)}</Text>}
          {!query && (
            <>
              <Text style={[styles.label, { marginTop: 4 }]}>{a.tabFav}</Text>
              <Section>
                {[
                  ...(['home', 'work'] as const).map((slot) => {
                    const f = favorites.find((x) => x.slot === slot);
                    return { key: slot, icon: slot as IconName, label: slot === 'home' ? a.home : a.work, sub: f ? f.name : a.setPlace, go: () => goFavorite(slot) };
                  }),
                  ...favorites
                    .filter((f) => f.slot === 'custom')
                    .map((f) => ({
                      key: f.id,
                      icon: 'starFill' as IconName,
                      label: f.label,
                      sub: f.address,
                      go: () => pickDest({ id: `fav-${f.id}`, name: f.name, address: f.address, kind: 'address', lat: f.lat, lng: f.lng }),
                    })),
                ].map((r, i, all) => (
                  <ListRow key={r.key} icon={r.icon} label={r.label} sub={r.sub} onPress={r.go} last={i === all.length - 1} />
                ))}
              </Section>
            </>
          )}
          <SearchStep t={t} query={query} setQuery={setQuery} results={results} onPick={pickDest} lang={lang} hideInput />
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
              <Text style={{ color: zoneText(hereOpt.zone.color), fontWeight: '800' }}>
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
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
            <Text style={[styles.h1, { flex: 1 }]}>{lang === 'en' && dest.nameEn ? dest.nameEn : dest.name}</Text>
            <Pressable
              onPress={() => setSaveOpen((o) => !o)}
              hitSlop={8}
              style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: C.brandSoft, alignItems: 'center', justifyContent: 'center' }}
              role="button" accessibilityLabel={a.savePlace}
            >
              <Icon name={destSaved ? 'starFill' : 'star'} size={24} color={titleColor()} />
            </Pressable>
          </View>
          {saveOpen && (
            <View style={[styles.card, { marginTop: 10, gap: 8 }]}>
              <Text style={{ color: C.sub, fontWeight: '700' }}>{a.saveAs}</Text>
              <View style={styles.chipRow}>
                <Chip active={false} text={a.home} onPress={() => saveFavorite('home')} />
                <Chip active={false} text={a.work} onPress={() => saveFavorite('work')} />
                <Chip active={false} text={a.custom} onPress={() => saveFavorite('custom')} />
              </View>
            </View>
          )}
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
              <Text style={[styles.sub, { marginTop: 6 }]}>{t.garagePrices}</Text>
              {selected.garage?.bookable && <PrimaryButton text={t.openPartner} onPress={() => Linking.openURL('https://parkl.net/')} />}
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
          payOptions={payOptions}
          profileOptions={profileOptions}
          profileId={profileId}
          setProfileId={setProfileId}
          credit={credit}
          onManagePay={() => {
            setMenuPage(cards.length ? 'payment' : 'cards');
            setTab('menu');
          }}
          a={a}
          plusFee={settings.plus !== 'monthly' && plusOnce ? PLUS_ONCE_FT : 0}
          plusSlot={<PlusOnPay a={a} monthly={settings.plus === 'monthly'} value={plusOnce} onChange={setPlusOnce} />}
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
          extra={
            <PlusActivePanel
              key={session.startedAt}
              a={a}
              s={session}
              hasPlus={settings.plus === 'monthly' || !!session.plusOnce}
              settings={settings}
              patchSettings={patchSettings}
              setSpot={(spot) => setSession((cur) => (cur ? { ...cur, spot: spot || undefined } : cur))}
              onUnlock={openPlus}
            />
          }
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

  const sideTop = (
    <View style={styles.sideTop}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: tab === 'park' ? 20 : 0 }}>
        <View style={styles.brandMark}>
          <Text style={{ color: C.brand, fontWeight: '900', fontSize: 13 }}>P</Text>
        </View>
        <Text style={{ fontSize: 22, letterSpacing: 2, color: C.brand }}>
          PARK<Text style={{ fontWeight: '900' }}>OLJ</Text>
        </Text>
        <Text style={{ color: C.sub, fontSize: 12, flex: 1, textAlign: 'right' }}>{t.tagline}</Text>
      </View>
      {tab === 'park' && searchPill}
    </View>
  );

  const bannerBg = banner?.kind === 'warn' ? C.warnSoft : banner?.kind === 'good' ? C.goodSoft : C.dangerSoft;
  const bannerFg = banner?.kind === 'warn' ? C.warn : banner?.kind === 'good' ? C.good : C.danger;
  const panel = (
    <ScrollView ref={scrollRef as never} style={{ flex: 1 }} contentContainerStyle={{ padding: wide ? 28 : 16, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
      {banner && tab === 'park' && (
        <Pressable onPress={() => banner.kind === 'good' && setBanner(null)} style={[styles.banner, { backgroundColor: bannerBg }]}>
          <Text style={{ color: bannerFg, fontWeight: '600' }}>{banner.text}</Text>
        </Pressable>
      )}
      {tab !== 'park' && tab !== 'parkings' && step === 'active' && session && (
        <Pressable onPress={() => setTab('parkings')} style={[styles.banner, { backgroundColor: C.brandSoft, flexDirection: 'row', justifyContent: 'space-between' }]}>
          <Text style={{ color: titleColor(), fontWeight: '700' }}>
            {t.activeShort} · {formatDuration(Math.ceil(activeLeft / 60), lang)}
          </Text>
          <Text style={{ color: titleColor(), fontWeight: '700' }}>{t.open} ›</Text>
        </Pressable>
      )}
      {tab === 'park' && parkPanel}
      {tab === 'fav' && (
        <FavoritesScreen
          t={t}
          a={a}
          lang={lang}
          favorites={favorites}
          setFavorites={setFavorites}
          onGo={pickDest}
          cars={cars}
          carId={carId}
          setCarId={setCarId}
          onAddCar={addCar}
          onRemoveCar={removeCar}
        />
      )}
      {tab === 'parkings' && (
        <ParkingsScreen
          t={t}
          a={a}
          lang={lang}
          session={step === 'active' ? session : null}
          history={history}
          helpBar={settings.helpBar}
          onHideHelp={() => patchSettings({ helpBar: false })}
          onDetails={() => setTab('park')}
          onExtend={extend}
          hasPlus={settings.plus === 'monthly'}
          onUnlockPlus={openPlus}
          onNew={() => {
            if (step === 'summary') reset();
            setTab('park');
          }}
        />
      )}
      {tab === 'menu' && (
        <MenuScreens
          t={t}
          a={a}
          lang={lang}
          setLang={setLang}
          page={menuPage}
          setPage={setMenuPage}
          account={account}
          setAccount={setAccount}
          notes={notes}
          setNotes={setNotes}
          settings={settings}
          patchSettings={patchSettings}
          cards={cards}
          setCards={setCards}
          profiles={profiles}
          setProfiles={setProfiles}
          credit={credit}
          redeemCoupon={redeemCoupon}
          demoSpeed={demoSpeed}
          setDemoSpeed={setDemoSpeed}
          onWipe={wipe}
          onFeedback={sendFeedback}
          auth={auth}
        />
      )}
      <Text style={styles.demoNote}>{t.demoBanner}</Text>
    </ScrollView>
  );

  // Alsó fülsor ikonokkal; az aktív fül ikonja lekerekített négyzetben (világosban lila, sötétben fehér)
  const TABS: [Tab, string, IconName][] = [
    ['park', a.tabPark, 'parking'],
    ['fav', a.tabFav, 'star'],
    ['parkings', a.tabParkings, 'ticket'],
    ['menu', a.tabMenu, 'menu'],
  ];
  const tabs = (
    <View style={styles.tabBar} role="tablist">
      {TABS.map(([k, label, icon]) => {
        const on = tab === k;
        return (
          <Pressable key={k} onPress={() => setTab(k)} style={styles.tabBtn} role="tab" aria-selected={on}>
            <View
              style={{
                width: 52,
                height: 34,
                borderRadius: 12,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: on ? (isDark ? '#FFFFFF' : C.brand) : 'transparent',
              }}
            >
              <Icon name={on && icon === 'star' ? 'starFill' : icon} size={24} color={on ? (isDark ? '#1C1B1F' : '#FFFFFF') : C.sub} />
              {k === 'parkings' && step === 'active' && (
                <View style={{ position: 'absolute', top: 2, right: 10, width: 9, height: 9, borderRadius: 5, backgroundColor: C.goodSolid, borderWidth: 1.5, borderColor: C.tabBar }} />
              )}
            </View>
            <Text style={{ fontWeight: on ? '800' : '600', fontSize: 12, marginTop: 3, color: on ? C.text : C.sub }} numberOfLines={1}>
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );

  if (!loaded) return <View style={{ flex: 1, backgroundColor: C.bg }} />;
  if (!onboarded)
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
        <StatusBar style={dark ? 'light' : 'dark'} />
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

  const sheetH = step === 'search' && !hereOpt ? '46%' : step === 'options' ? '60%' : '64%';

  return (
    <SafeAreaView testID="app-root" style={{ flex: 1, backgroundColor: wide || tab !== 'park' ? C.bg : C.card }} edges={wide ? ['top', 'bottom'] : ['top']}>
      <StatusBar style={dark ? 'light' : 'dark'} />
      {wide ? (
        <View style={{ flex: 1, flexDirection: 'row' }}>
          <View style={{ width: 460, backgroundColor: C.bg, borderRightWidth: 1, borderColor: C.line }}>
            {sideTop}
            {panel}
            {tabs}
          </View>
          {map}
        </View>
      ) : tab === 'park' ? (
        <View style={{ flex: 1 }}>
          {map}
          <View style={[styles.sheet, { height: sheetH }]}>
            <View style={styles.grabber} />
            {panel}
            <SafeAreaView edges={['bottom']} style={{ backgroundColor: C.tabBar }}>
              {tabs}
            </SafeAreaView>
          </View>
        </View>
      ) : (
        // Telefonon a többi fül teljes képernyős oldal (mint a BudapestGO-ban)
        <View style={{ flex: 1, backgroundColor: C.bg }}>
          {panel}
          <SafeAreaView edges={['bottom']} style={{ backgroundColor: C.tabBar }}>
            {tabs}
          </SafeAreaView>
        </View>
      )}
    </SafeAreaView>
  );
}
