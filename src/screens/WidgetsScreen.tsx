import { useEffect, useState } from 'react';
import { Platform, Text, View } from 'react-native';
import { PageHeader, Section, Segmented } from '../components/kit';
import { C } from '../components/ui';
import type { Lang } from '../i18n';
import { LivePreview, LockPreview, ParkingPreview, QuickPreview } from '../widgets/WidgetPreviews';
import type { WidgetAction, WidgetData } from '../widgets/widgetModel';

// Menü → Widgetek: a kezdőképernyő-widgetek élő előnézete (az app aktuális adataival) és a kihelyezés lépései.
const T = {
  hu: {
    title: 'Widgetek',
    lead: 'Tedd ki a Parkolj widgetet a telefonod kezdőképernyőjére: egy pillantással látod, mennyi időd van még, és egy koppintással hosszabbítasz, leállítasz vagy indítasz.',
    phone: 'Telefon',
    look: 'Megjelenés',
    light: 'Világos',
    dark: 'Sötét',
    parking: 'Parkolásom',
    parkingSub: 'Zóna, rendszám, hátralévő idő, +15 perc és leállítás. Kicsi és közepes méretben.',
    lock: 'Zárolt képernyőn',
    live: 'Élő tevékenység',
    liveSub: 'Parkolás közben a zárolt képernyőn és a Dynamic Islandben is látszik a visszaszámlálás, gombokkal. Magától jelenik meg, nem kell kitenni.',
    liveIdle: 'Parkolás indításakor jelenik meg.',
    quick: 'Gyors indítás',
    quickSub: 'Parkolás ott, ahol állsz, vagy otthon és a munkahelyed közelében.',
    how: 'Hogyan tedd ki?',
    ios: ['Tartsd lenyomva a kezdőképernyő egy üres részét.', 'Koppints a bal felső „Szerkesztés”, majd a „Widget hozzáadása” gombra.', 'Keresd meg a Parkolj appot, válaszd a méretet, és koppints a „Widget hozzáadása” gombra.', 'Zárolt képernyőre: tartsd lenyomva a zárolt képernyőt → Testreszabás → Widgetek hozzáadása.'],
    android: ['Tartsd lenyomva a kezdőképernyő egy üres részét.', 'Koppints a „Widgetek” gombra.', 'Keresd meg a Parkolj appot, és húzd a widgetet a kezdőképernyőre.', 'A sarkánál fogva átméretezheted: kisebb méretben csak a lényeg látszik.'],
    note: 'Előnézet a webes demóban: a gombok itt is működnek, ugyanazt csinálják, mint a telefonon. A widget csak a telefonos appban tehető ki.',
    liveIos: 'iPhone-on a visszaszámlálás másodpercre pontos, akkor is, ha az app nem fut.',
    liveAndroid: 'Androidon a widget a lejárat pontos idejét mutatja, és minden változáskor azonnal frissül.',
  },
  en: {
    title: 'Widgets',
    lead: 'Put the Parkolj widget on your home screen: see at a glance how much time you have left, and extend, stop or start with one tap.',
    phone: 'Phone',
    look: 'Appearance',
    light: 'Light',
    dark: 'Dark',
    parking: 'My parking',
    parkingSub: 'Zone, plate, time left, +15 min and stop. Small and medium size.',
    lock: 'On the Lock Screen',
    live: 'Live Activity',
    liveSub: 'While parking, the countdown shows on the Lock Screen and in the Dynamic Island, with buttons. It appears by itself, no setup needed.',
    liveIdle: 'Appears when you start parking.',
    quick: 'Quick start',
    quickSub: 'Park where you are, or near home and work.',
    how: 'How to add it',
    ios: ['Touch and hold an empty area of the Home Screen.', 'Tap “Edit” in the top left, then “Add Widget”.', 'Find Parkolj, choose a size and tap “Add Widget”.', 'Lock Screen: touch and hold the Lock Screen → Customize → Add Widgets.'],
    android: ['Touch and hold an empty area of the home screen.', 'Tap “Widgets”.', 'Find Parkolj and drag the widget to your home screen.', 'Resize it by its corner: smaller sizes show just the essentials.'],
    note: 'Preview in the web demo: the buttons work here too and do the same as on the phone. The widget itself is only available in the phone app.',
    liveIos: 'On iPhone the countdown is accurate to the second, even when the app is closed.',
    liveAndroid: 'On Android the widget shows the exact end time and updates instantly on every change.',
  },
  de: {
    title: 'Widgets',
    lead: 'Leg das Parkolj-Widget auf deinen Startbildschirm: Du siehst auf einen Blick, wie viel Zeit bleibt, und verlängerst, beendest oder startest mit einem Tipp.',
    phone: 'Handy',
    look: 'Darstellung',
    light: 'Hell',
    dark: 'Dunkel',
    parking: 'Mein Parken',
    parkingSub: 'Zone, Kennzeichen, Restzeit, +15 Min. und Beenden. Klein und mittel.',
    lock: 'Auf dem Sperrbildschirm',
    live: 'Live-Aktivität',
    liveSub: 'Beim Parken läuft der Countdown auf dem Sperrbildschirm und in der Dynamic Island, mit Tasten. Erscheint von selbst, ohne Einrichtung.',
    liveIdle: 'Erscheint, wenn du das Parken startest.',
    quick: 'Schnellstart',
    quickSub: 'Hier parken, oder in der Nähe von Zuhause und Arbeit.',
    how: 'So fügst du es hinzu',
    ios: ['Leeren Bereich des Home-Bildschirms gedrückt halten.', 'Oben links auf „Bearbeiten“, dann auf „Widget hinzufügen“ tippen.', 'Parkolj suchen, Größe wählen und „Widget hinzufügen“ tippen.', 'Sperrbildschirm: Sperrbildschirm gedrückt halten → Anpassen → Widgets hinzufügen.'],
    android: ['Leeren Bereich des Startbildschirms gedrückt halten.', 'Auf „Widgets“ tippen.', 'Parkolj suchen und das Widget auf den Startbildschirm ziehen.', 'An der Ecke kannst du die Größe ändern: Kleiner zeigt nur das Wichtigste.'],
    note: 'Vorschau in der Web-Demo: Die Tasten funktionieren auch hier wie auf dem Handy. Das Widget selbst gibt es nur in der Handy-App.',
    liveIos: 'Auf dem iPhone läuft der Countdown sekundengenau, auch wenn die App geschlossen ist.',
    liveAndroid: 'Auf Android zeigt das Widget die genaue Ablaufzeit und aktualisiert sich bei jeder Änderung sofort.',
  },
};

export default function WidgetsScreen({ lang, data, onAction, onBack }: { lang: Lang; data: WidgetData; onAction: (a: WidgetAction) => void; onBack: () => void }) {
  const t = T[lang];
  const [os, setOs] = useState<'ios' | 'android'>(Platform.OS === 'android' ? 'android' : 'ios');
  const [dark, setDark] = useState<'light' | 'dark'>('light');
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const live = os === 'ios';
  const wall = dark === 'dark' ? '#1B1530' : '#D9CFE6';
  const stage = { backgroundColor: wall, borderRadius: 18, padding: 16, gap: 14, alignItems: 'center' as const };
  const h = { fontSize: 15, fontWeight: '700' as const, color: C.sub, marginBottom: 8, marginLeft: 4, marginTop: 6 };

  return (
    <View>
      <PageHeader title={t.title} onBack={onBack} />
      <Text style={{ color: C.text, fontSize: 15, lineHeight: 21, marginBottom: 14 }}>{t.lead}</Text>
      <View style={{ gap: 10, marginBottom: 16 }}>
        <Segmented options={[['ios', 'iPhone'], ['android', 'Android']]} value={os} onChange={setOs} />
        <Segmented options={[['light', t.light], ['dark', t.dark]]} value={dark} onChange={setDark} />
      </View>

      <Text role="heading" aria-level={2} style={h}>
        {t.parking}
      </Text>
      <View testID="widget-stage" style={stage}>
        <ParkingPreview d={data} now={now} dark={dark === 'dark'} size="medium" live={live} onAction={onAction} />
        <View style={{ flexDirection: 'row', gap: 14, flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center' }}>
          <ParkingPreview d={data} now={now} dark={dark === 'dark'} size="small" live={live} onAction={onAction} />
          {os === 'ios' && (
            <View style={{ alignItems: 'center', gap: 6, backgroundColor: '#1B1530', borderRadius: 18, padding: 12 }}>
              <LockPreview d={data} now={now} />
              <Text style={{ color: '#fff', fontSize: 12 }}>{t.lock}</Text>
            </View>
          )}
        </View>
      </View>
      <Text style={{ color: C.sub, fontSize: 13, marginTop: 8, marginBottom: 4, marginLeft: 4 }}>{t.parkingSub}</Text>
      <Text style={{ color: C.sub, fontSize: 13, marginBottom: 12, marginLeft: 4 }}>{live ? t.liveIos : t.liveAndroid}</Text>

      {os === 'ios' && (
        <>
          <Text role="heading" aria-level={2} style={h}>
            {t.live}
          </Text>
          <View testID="live-stage" style={{ ...stage, backgroundColor: '#1B1530' }}>
            {data.active ? <LivePreview d={data} now={now} onAction={onAction} /> : <Text style={{ color: '#fff', fontSize: 14 }}>{t.liveIdle}</Text>}
          </View>
          <Text style={{ color: C.sub, fontSize: 13, marginTop: 8, marginBottom: 12, marginLeft: 4 }}>{t.liveSub}</Text>
        </>
      )}

      <Text role="heading" aria-level={2} style={h}>
        {t.quick}
      </Text>
      <View style={stage}>
        <QuickPreview d={data} dark={dark === 'dark'} onAction={onAction} />
      </View>
      <Text style={{ color: C.sub, fontSize: 13, marginTop: 8, marginBottom: 16, marginLeft: 4 }}>{t.quickSub}</Text>

      <Section title={t.how}>
        <View style={{ padding: 16, gap: 8 }}>
          {(os === 'ios' ? t.ios : t.android).map((s, i) => (
            <Text key={s} style={{ color: C.text, fontSize: 15, lineHeight: 21 }}>
              {i + 1}. {s}
            </Text>
          ))}
        </View>
      </Section>
      <Text style={{ color: C.sub, fontSize: 13, lineHeight: 19, marginLeft: 4 }}>{t.note}</Text>
    </View>
  );
}
