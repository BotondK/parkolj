import { useEffect, useState } from 'react';
import { Linking, Platform, Pressable, ScrollView, Text, useColorScheme, View } from 'react-native';
import { Field, Segmented, titleColor } from '../components/kit';
import { applyTheme, C, isDark, PrimaryButton } from '../components/ui';
import type { Lang } from '../i18n';
import { BETA_FREQS, BETA_PLATFORMS, BETA_WHO, betaError, betaRow, type BetaForm } from '../logic/betaCore';
import { cloud } from '../logic/cloud';
import PrivacyScreen from './PrivacyScreen';

// Jelentkezés a zárt bétára (a webes demóban: ?beta). Magyarul, angolul és németül; a cím csak a meghívóhoz kell.

const T = {
  hu: {
    title: 'Légy béta tesztelő',
    lead: 'A Parkolj a budapesti utcai parkolást teszi egyszerűbbé: megmutatja a célod körüli zónát, díjat és időkorlátot, odanavigál, és szól, mielőtt lejár a parkolásod. 2027 tavaszán zárt bétát indítunk 50–100 tesztelővel. Jelentkezz, és elsőként kapsz meghívót iPhone-ra vagy Androidra.',
    perks: ['Ingyenes Parkolj Plusz a béta alatt', 'A visszajelzésed alapján fejlesztünk', 'Bármikor kiléphetsz'],
    email: 'E-mail cím',
    ph: 'nev@pelda.hu',
    platform: 'Milyen telefonod van?',
    platforms: { ios: 'iPhone', android: 'Android', web: 'Csak böngésző' },
    freq: 'Milyen gyakran parkolsz Budapesten az utcán?',
    freqs: { daily: 'Szinte naponta', weekly: 'Hetente', monthly: 'Havonta', rarely: 'Ritkábban' },
    who: 'Te inkább…',
    whos: { resident: 'budapesti lakos', commuter: 'ingázó', visitor: 'látogató, turista' },
    consent: 'Hozzájárulok, hogy a fenti adatokat a béta meghívóhoz tárolják. A béta végén törlődnek.',
    privacy: 'Adatkezelési tájékoztató',
    send: 'Jelentkezem',
    sending: 'Küldés…',
    errors: { email: 'Adj meg egy érvényes e-mail címet.', platform: 'Válaszd ki a telefonod típusát.', freq: 'Válaszd ki, milyen gyakran parkolsz.', who: 'Válaszd ki, melyik illik rád.', consent: 'A jelentkezéshez el kell fogadnod az adatkezelést.' },
    fail: 'Most nem sikerült elküldeni. Ellenőrizd az internetet, és próbáld újra.',
    off: 'A jelentkezés még nincs bekapcsolva ezen az oldalon. Írj nekünk e-mailt, vagy próbáld később.',
    done: 'Köszönjük, felírtunk!',
    doneSub: 'Amint indul a béta, e-mailben küldjük a meghívót. Addig is kipróbálhatod a webes demót.',
    demo: 'Webes demó megnyitása',
  },
  en: {
    title: 'Become a beta tester',
    lead: 'Parkolj makes street parking in Budapest simple: it shows the zone, fee and time limit around your destination, navigates you there and reminds you before your parking runs out. In spring 2027 we start a closed beta with 50–100 testers. Sign up to get one of the first invites for iPhone or Android.',
    perks: ['Free Parkolj Plus during the beta', 'We build on your feedback', 'Leave any time'],
    email: 'Email',
    ph: 'name@example.com',
    platform: 'Which phone do you have?',
    platforms: { ios: 'iPhone', android: 'Android', web: 'Browser only' },
    freq: 'How often do you park on the street in Budapest?',
    freqs: { daily: 'Almost daily', weekly: 'Weekly', monthly: 'Monthly', rarely: 'Less often' },
    who: 'You are mostly a…',
    whos: { resident: 'Budapest resident', commuter: 'commuter', visitor: 'visitor or tourist' },
    consent: 'I agree that the details above are stored for the beta invite. They are deleted when the beta ends.',
    privacy: 'Privacy notice',
    send: 'Sign me up',
    sending: 'Sending…',
    errors: { email: 'Enter a valid email address.', platform: 'Choose your phone type.', freq: 'Choose how often you park.', who: 'Choose the one that fits you.', consent: 'Please accept the data handling to sign up.' },
    fail: 'Could not send it right now. Check your connection and try again.',
    off: 'Sign-up is not switched on for this page yet. Please email us or try later.',
    done: 'Thank you, you are on the list!',
    doneSub: 'We will email your invite as soon as the beta starts. Until then, try the web demo.',
    demo: 'Open the web demo',
  },
  de: {
    title: 'Werde Beta-Tester',
    lead: 'Parkolj macht das Parken auf Budapests Straßen einfach: Es zeigt Zone, Gebühr und Höchstparkdauer rund um dein Ziel, navigiert dich hin und erinnert dich, bevor dein Parkvorgang abläuft. Im Frühjahr 2027 starten wir eine geschlossene Beta mit 50–100 Testern. Melde dich an und erhalte eine der ersten Einladungen für iPhone oder Android.',
    perks: ['Parkolj Plus während der Beta kostenlos', 'Wir entwickeln nach deinem Feedback', 'Jederzeit austreten'],
    email: 'E-Mail',
    ph: 'name@beispiel.de',
    platform: 'Welches Handy hast du?',
    platforms: { ios: 'iPhone', android: 'Android', web: 'Nur Browser' },
    freq: 'Wie oft parkst du in Budapest auf der Straße?',
    freqs: { daily: 'Fast täglich', weekly: 'Wöchentlich', monthly: 'Monatlich', rarely: 'Seltener' },
    who: 'Du bist eher…',
    whos: { resident: 'Budapester', commuter: 'Pendler', visitor: 'Besucher, Tourist' },
    consent: 'Ich willige ein, dass die obigen Angaben für die Beta-Einladung gespeichert werden. Am Ende der Beta werden sie gelöscht.',
    privacy: 'Datenschutzhinweis',
    send: 'Anmelden',
    sending: 'Wird gesendet…',
    errors: { email: 'Gib eine gültige E-Mail-Adresse ein.', platform: 'Wähle deinen Handytyp.', freq: 'Wähle, wie oft du parkst.', who: 'Wähle, was auf dich zutrifft.', consent: 'Bitte stimme der Datenverarbeitung zu.' },
    fail: 'Senden gerade nicht möglich. Prüfe deine Verbindung und versuche es erneut.',
    off: 'Die Anmeldung ist auf dieser Seite noch nicht aktiv. Schreib uns eine E-Mail oder versuche es später.',
    done: 'Danke, du stehst auf der Liste!',
    doneSub: 'Sobald die Beta startet, schicken wir dir die Einladung per E-Mail. Bis dahin kannst du die Web-Demo ausprobieren.',
    demo: 'Web-Demo öffnen',
  },
} satisfies Record<Lang, unknown>;

const startLang = (): Lang => {
  const q = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('lang') : null;
  const loc = (q || (typeof navigator !== 'undefined' ? navigator.language : '') || 'hu').toLowerCase();
  return loc.startsWith('hu') ? 'hu' : loc.startsWith('de') ? 'de' : 'en';
};

function Choice<K extends string>({ label, keys, names, value, onChange }: { label: string; keys: readonly K[]; names: Record<K, string>; value: K | null; onChange: (k: K) => void }) {
  return (
    <View style={{ marginBottom: 16 }}>
      <Text nativeID={`q-${keys[0]}`} style={{ fontSize: 13, fontWeight: '700', color: C.sub, marginBottom: 8 }}>
        {label}
      </Text>
      <View role="radiogroup" aria-labelledby={`q-${keys[0]}`} style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {keys.map((k) => {
          const on = k === value;
          return (
            <Pressable
              key={k}
              role="radio"
              aria-checked={on}
              onPress={() => onChange(k)}
              style={{ minHeight: 44, justifyContent: 'center', paddingHorizontal: 16, borderRadius: 22, borderWidth: 1.5, borderColor: on ? C.primary : C.line, backgroundColor: on ? C.primary : C.card }}
            >
              <Text style={{ color: on ? C.onPrimary : C.text, fontWeight: '700', fontSize: 15 }}>{names[k]}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export default function BetaScreen() {
  const scheme = useColorScheme();
  const [, force] = useState(0);
  useEffect(() => {
    applyTheme(scheme === 'dark');
    force((n) => n + 1);
  }, [scheme]);
  const [lang, setLang] = useState<Lang>(startLang);
  const t = T[lang];
  const [form, setForm] = useState<BetaForm>({ email: '', platform: null, freq: null, who: null, consent: false });
  const [tried, setTried] = useState(false);
  const [state, setState] = useState<'idle' | 'sending' | 'done' | 'fail' | 'off'>('idle');
  const [privacy, setPrivacy] = useState(false);
  useEffect(() => {
    if (Platform.OS === 'web') document.title = `Parkolj · ${t.title}`;
  }, [t.title]);

  const err = betaError(form);
  const set = (p: Partial<BetaForm>) => setForm((f) => ({ ...f, ...p }));
  const appUrl = Platform.OS === 'web' ? window.location.pathname : 'https://botondk.github.io/parkolj/';

  const submit = async () => {
    setTried(true);
    if (err) return;
    if (!cloud) return setState('off');
    setState('sending');
    try {
      await cloud.betaSignup(betaRow(form, lang));
      setState('done');
    } catch {
      setState('fail');
    }
  };

  const wrap = { padding: 16, paddingBottom: 48, width: '100%' as const, maxWidth: 560, alignSelf: 'center' as const, gap: 16 };

  if (privacy)
    return (
      <ScrollView style={{ flex: 1, backgroundColor: C.bg }} contentContainerStyle={wrap}>
        <PrivacyScreen lang={lang} onBack={() => setPrivacy(false)} />
      </ScrollView>
    );

  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.bg }} contentContainerStyle={wrap} keyboardShouldPersistTaps="handled">
      <Segmented options={[['hu', 'Magyar'], ['en', 'English'], ['de', 'Deutsch']]} value={lang} onChange={setLang} />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 8 }}>
        <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: C.brand, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: '#fff', fontWeight: '900', fontSize: 26 }}>P</Text>
        </View>
        <Text style={{ fontSize: 22, fontWeight: '800', color: titleColor() }}>Parkolj</Text>
      </View>
      <Text role="heading" aria-level={1} style={{ fontSize: 30, fontWeight: '800', color: titleColor(), letterSpacing: -0.4 }}>
        {state === 'done' ? t.done : t.title}
      </Text>

      {state === 'done' ? (
        <View style={{ gap: 16 }}>
          <Text style={{ color: C.text, fontSize: 16, lineHeight: 23 }}>{t.doneSub}</Text>
          <PrimaryButton text={t.demo} onPress={() => Linking.openURL(appUrl)} />
        </View>
      ) : (
        <>
          <Text style={{ color: C.text, fontSize: 16, lineHeight: 23 }}>{t.lead}</Text>
          <View style={{ backgroundColor: C.brandSoft, borderRadius: 14, padding: 14, gap: 6 }}>
            {t.perks.map((p) => (
              <Text key={p} style={{ color: C.text, fontSize: 15, fontWeight: '600' }}>
                ✓ {p}
              </Text>
            ))}
          </View>

          <View style={{ backgroundColor: C.card, borderRadius: 18, borderWidth: isDark ? 0 : 1, borderColor: C.line, padding: 16 }}>
            <Field label={t.email} value={form.email} onChange={(email) => set({ email })} keyboard="email-address" placeholder={t.ph} maxLength={254} error={tried && err === 'email' ? t.errors.email : null} />
            <Choice label={t.platform} keys={BETA_PLATFORMS} names={t.platforms} value={form.platform} onChange={(platform) => set({ platform })} />
            <Choice label={t.freq} keys={BETA_FREQS} names={t.freqs} value={form.freq} onChange={(freq) => set({ freq })} />
            <Choice label={t.who} keys={BETA_WHO} names={t.whos} value={form.who} onChange={(who) => set({ who })} />

            <Pressable role="checkbox" aria-checked={form.consent} onPress={() => set({ consent: !form.consent })} style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start', paddingVertical: 6 }}>
              <View style={{ width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: form.consent ? C.primary : C.sub, backgroundColor: form.consent ? C.primary : 'transparent', alignItems: 'center', justifyContent: 'center', marginTop: 1 }}>
                {form.consent && <Text style={{ color: C.onPrimary, fontWeight: '900', fontSize: 15 }}>✓</Text>}
              </View>
              <Text style={{ flex: 1, color: C.text, fontSize: 14, lineHeight: 20 }}>{t.consent}</Text>
            </Pressable>
            <Pressable role="link" onPress={() => setPrivacy(true)} style={{ alignSelf: 'flex-start', paddingVertical: 8, marginLeft: 36 }}>
              <Text style={{ color: titleColor(), fontWeight: '700', textDecorationLine: 'underline' }}>{t.privacy}</Text>
            </Pressable>

            {tried && err && err !== 'email' && (
              <Text role="alert" style={{ color: C.danger, fontSize: 14, marginTop: 6 }}>
                {t.errors[err]}
              </Text>
            )}
            {(state === 'fail' || state === 'off') && (
              <Text role="alert" style={{ color: C.danger, fontSize: 14, marginTop: 6 }}>
                {state === 'fail' ? t.fail : t.off}
              </Text>
            )}
            <View style={{ marginTop: 12 }}>
              <PrimaryButton text={state === 'sending' ? t.sending : t.send} onPress={submit} disabled={state === 'sending'} />
            </View>
          </View>

          <Pressable role="link" onPress={() => Linking.openURL(appUrl)} style={{ alignSelf: 'center', padding: 8 }}>
            <Text style={{ color: titleColor(), fontWeight: '700', textDecorationLine: 'underline' }}>{t.demo}</Text>
          </Pressable>
        </>
      )}
    </ScrollView>
  );
}
