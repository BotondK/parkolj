import { Component, Fragment, useEffect, useState, type ReactNode } from 'react';
import { Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { reportCrash } from '../logic/crash';
import { formatClock } from '../logic/pricing';
import { loadJSON } from '../logic/storage';
import type { Session } from '../types';
import { C } from './ui';

// Ha az app egy hiba miatt nem tud kirajzolódni, üres fehér képernyő helyett ez jelenik meg.
// A legfontosabb: az aktív parkolás (zóna, rendszám, meddig érvényes) akkor is látsszon, és egy gombbal újraindítható legyen.
// Szándékosan kevés függőség: csak a helyi tárolót és a színeket használja.

type Lang = 'hu' | 'en' | 'de';
const S = {
  hu: {
    title: 'Hoppá, hiba történt',
    body: 'Az app egy része nem tudott betöltődni. Az adataid megvannak, és a futó parkolásod nem állt le.',
    sent: 'A hibáról névtelen jelentést küldünk, hogy kijavíthassuk (rendszám, név és hely nélkül).',
    active: 'Futó parkolásod',
    until: (t: string) => `Érvényes eddig: ${t}`,
    expired: 'Az idő lejárt: ha még ott áll az autó, indíts új parkolást vagy fizess SMS-ben.',
    restart: 'Újraindítás',
  },
  en: {
    title: 'Oops, something went wrong',
    body: 'Part of the app could not load. Your data is safe and your running parking has not stopped.',
    sent: 'We send an anonymous error report so we can fix it (no plate, name or location).',
    active: 'Your running parking',
    until: (t: string) => `Valid until ${t}`,
    expired: 'Time is up: if the car is still there, start a new parking or pay by SMS.',
    restart: 'Restart',
  },
  de: {
    title: 'Hoppla, ein Fehler ist aufgetreten',
    body: 'Ein Teil der App konnte nicht geladen werden. Deine Daten sind sicher und dein laufender Parkvorgang wurde nicht beendet.',
    sent: 'Wir senden einen anonymen Fehlerbericht, damit wir ihn beheben können (ohne Kennzeichen, Name oder Ort).',
    active: 'Dein laufender Parkvorgang',
    until: (t: string) => `Gültig bis ${t}`,
    expired: 'Die Zeit ist abgelaufen: Steht das Auto noch dort, starte einen neuen Parkvorgang oder zahle per SMS.',
    restart: 'Neu starten',
  },
};

function guessLang(): Lang {
  try {
    const l = (Intl.DateTimeFormat().resolvedOptions().locale || 'hu').slice(0, 2);
    return l === 'en' || l === 'de' ? l : 'hu';
  } catch {
    return 'hu';
  }
}

function Fallback({ onRestart }: { onRestart: () => void }) {
  const [lang, setLang] = useState<Lang>(guessLang);
  const [session, setSession] = useState<Session | null>(null);
  useEffect(() => {
    loadJSON<Lang | null>('lang', null).then((l) => l && S[l] && setLang(l));
    loadJSON<Session | null>('session', null).then(setSession);
  }, []);
  const s = S[lang];
  const end = session ? session.startedAt + session.durationMin * 60000 : 0;
  const zone = session?.option?.zone?.id;
  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.bg }} contentContainerStyle={{ padding: 24, paddingTop: 64, gap: 14, maxWidth: 520, width: '100%', alignSelf: 'center' }}>
      <View testID="crash-screen" accessibilityRole="alert">
        <Text accessibilityRole="header" style={{ fontSize: 24, fontWeight: '800', color: C.text }}>
          {s.title}
        </Text>
        <Text style={{ fontSize: 16, color: C.text, marginTop: 10, lineHeight: 22 }}>{s.body}</Text>
      </View>
      {session && (
        <View testID="crash-ticket" style={{ backgroundColor: C.card, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: C.line }}>
          <Text style={{ color: C.sub, fontSize: 13 }}>{s.active}</Text>
          <Text style={{ color: C.text, fontSize: 20, fontWeight: '800', marginTop: 4 }}>
            {zone ? `${zone} · ` : ''}
            {session.plate}
          </Text>
          <Text style={{ color: C.text, marginTop: 2 }}>{session.placeName}</Text>
          <Text style={{ color: end > Date.now() ? C.text : C.danger, fontWeight: '700', marginTop: 8 }}>{end > Date.now() ? s.until(formatClock(new Date(end))) : s.expired}</Text>
        </View>
      )}
      <Pressable accessibilityRole="button" onPress={onRestart} style={{ backgroundColor: C.brand, borderRadius: 14, paddingVertical: 14, alignItems: 'center' }}>
        <Text style={{ color: C.onBrand, fontWeight: '700', fontSize: 16 }}>{s.restart}</Text>
      </Pressable>
      <Text style={{ color: C.sub, fontSize: 13 }}>{s.sent}</Text>
    </ScrollView>
  );
}

export class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean; key: number }> {
  state = { failed: false, key: 0 };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: unknown) {
    reportCrash(error, 'render');
  }
  restart = () => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      // A teszthez használt ?crashtest paramétert elhagyjuk, különben újra összeomlana
      const u = new URL(window.location.href);
      u.searchParams.delete('crashtest');
      window.location.replace(u.toString());
      return;
    }
    this.setState((s) => ({ failed: false, key: s.key + 1 }));
  };
  render() {
    if (this.state.failed) return <Fallback onRestart={this.restart} />;
    return <Fragment key={this.state.key}>{this.props.children}</Fragment>;
  }
}
