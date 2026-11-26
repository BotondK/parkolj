import { useState, type ReactNode } from 'react';
import { Linking, Platform, Pressable, Text, View } from 'react-native';
import { TOUR_UI } from '../logic/tour';
import app from '../../app.json';
import { Icon, type IconName } from '../components/icons';
import { ListRow, PageHeader, Section, titleColor } from '../components/kit';
import { MARKER_COLORS, MARKER_GLYPH } from '../components/mapTypes';
import { bgForWhite, C, isDark, styles } from '../components/ui';
import { ZONES } from '../data/zones';
import type { Lang, Strings } from '../i18n';
import InfoScreen from './InfoScreen';

// „Információk és súgó” a BudapestGO mintájára, parkolásra szabva: baj esetén teendők, jelmagyarázat, fő funkciók,
// a mobilparkolás működése, GYIK, visszajelzés, a fővárosi parkolás elérhetősége, dokumentumok és verzió.

type Sub = 'home' | 'about' | 'legend' | 'features' | 'how' | 'faq' | 'a11y' | 'licenses';
type QA = [q: string, a: string];

const HU = {
  title: 'Információk és súgó',
  sosTitle: 'Vészhelyzet van?',
  sosBody: 'Baleset, sérülés, veszély esetén hívd a 112-es segélyhívó számot.',
  call: 'Hívás: 112',
  carTitle: 'Nem találod az autód?',
  carBody: 'Előbb nézd meg a Parkolásaim fülön a jegyet: ott van, hol hagytad (utca, garázsszint, fotó). Ha ott sincs, hívd a 112-t: a rendőrség megmondja, ha elszállították, vagy ott jelentheted be a lopást.',
  damageTitle: 'Megsérült az autód parkolás közben?',
  damageBody: 'Ha a károkozó ott van, töltsétek ki együtt az európai baleseti bejelentőt, és fotózzátok le a helyszínt. Ha elment, vagy nem értetek egyet, hívd a rendőrséget (112).',
  helpSection: 'Parkolj súgó és támogatás',
  legend: 'Jelmagyarázat',
  features: 'Az alkalmazás fő funkciói',
  how: 'A mobilparkolás működése',
  faq: 'Gyakran ismételt kérdések',
  tourSub: 'Egy perces, lépésenkénti bemutató egy estéről (kivetítőre is)',
  fbTitle: 'Visszajelzés az app működéséről',
  fbBody: 'Írd meg, mi nem működik, vagy mit csinálnál másképp. Minden visszajelzést elolvasunk.',
  fbBtn: 'Visszajelzés küldése',
  citySection: 'Budapesti parkolás',
  cityFbTitle: 'Hibás zóna, ár vagy tábla?',
  cityFbBody: 'A fizetésnél a „Hibás zóna vagy ár? Jelezd” gombbal névtelenül jelezheted; a „Nem volt hely” jelzésekből összesítést adunk a városnak. A parkolásszervezésről a fővárosi közlekedésszervezőnél is panaszt tehetsz.',
  cityLink: 'Fővárosi parkolási tájékoztató (bkk.hu)',
  docs: 'Dokumentumok',
  privacy: 'Adatkezelési tájékoztató',
  terms: 'Béta felhasználási feltételek',
  termsSoon: 'A teljes ÁSZF a fizetős indulás előtt készül el',
  a11y: 'Akadálymentesítési nyilatkozat',
  licenses: 'Licencek és adatforrások',
  version: (v: string) => `Verzió: ${v} (prototípus)`,
  about: 'Névjegy',
  aboutBody: 'Parkolás a célod mellett, Budapesten: a célodhoz legközelebbi, legolcsóbb és legbiztosabb helyet mutatja, odanavigál, és percre pontosan fizetsz. Két budapesti fejlesztő saját projektje; jelenleg prototípus, a zárt bétára készül.',
  // Jelmagyarázat
  zonesTitle: 'Parkolási zónák',
  zoneLine: (ft: number, h: string) => `${ft} Ft/óra · fizetős hétköznap ${h}`,
  mapTitle: 'Térképen megjelenő jelek',
  marks: {
    dest: 'Ahova mész (célpont)',
    fastest: '1. javaslat: utcán, közel',
    cheapest: '2. javaslat: utcán, olcsóbb',
    garage: '3. javaslat: garázs',
    here: '„Parkolás itt”: ahol most állsz',
  },
  layerGarage: 'Mélygarázs, parkolóház (térképréteg)',
  layerPr: 'P+R parkoló (ingyenes, a város szélén)',
  layerCharger: 'Elektromos töltő',
  me: 'Saját helyzeted (GPS)',
  district: 'Kerülethatár',
  chanceTitle: 'Mit jelöl az esély színe?',
  chanceGood: 'Zöld: jó eséllyel van szabad hely (60% fölött)',
  chanceMid: 'Narancs: közepes esély (40–60%)',
  chanceBad: 'Piros: kevés az esély (40% alatt)',
  chanceNote: 'Az esély becslés (a prototípusban szimulált), a „Nem volt hely” jelzések csökkentik.',
  badgesTitle: 'Jelölések a javaslatokon',
  badgeQuick: '⚡ Leggyorsabb: a helykeresés és a gyaloglás együtt itt a legrövidebb',
  badgeFull: 'Mások itt ilyenkor gyakran nem találtak helyet',
  badgeGarage: 'Garázs: biztos hely, nincs 3 órás korlát',
  // Fő funkciók
  feat: [
    ['search', 'Keresés célpontra', 'Színház, mozi, cím: a célod mellé ad három parkolási lehetőséget.'],
    ['map', 'Három javaslat', 'Utcán közel, utcán olcsóbb, garázs; árral, eséllyel, idővel a célig.'],
    ['external', 'Navigáció', 'Egy gombbal átadja a Google Mapsnek, Apple Térképnek vagy Waze-nek.'],
    ['ticket', 'Indítás és leállítás', 'Percre pontos díj, csak a fizetős időre; +15 perc egy gombbal.'],
    ['bell', 'Lejárati figyelmeztetés', 'Szól a lejárat előtt és lejáratkor, a 3 órás szabályra is figyel.'],
    ['car', 'Hol hagytam az autót?', 'Garázsszint, jegyzet, fotó a jegyen; vissza az autóhoz gyalog.'],
    ['star', 'Kedvenceim', 'Otthon, munkahely, mentett helyek és autók.'],
    ['receipt', 'Parkolásaim', 'Aktív jegy, előzmények, nyugták, havi összesítő.'],
    ['parking', 'Parkolj Plusz', 'Automatikus hosszabbítás, havi kimutatás.'],
  ] as [IconName, string, string][],
  // GYIK
  faqs: [
    ['Tényleg fizetek az appban?', 'A prototípusban nem: a fizetés demó, nincs valódi terhelés. Az éles fizetés a hivatalos viszonteladói szerződés után indul.'],
    ['Mennyit fizetek?', 'Percre pontosan, és csak a fizetős időre. Ha közben díjmentes lesz (pl. este), addig számolunk.'],
    ['Mi a 3 órás szabály?', 'Az A, B és C zónában egyszerre legfeljebb 3 órát parkolhatsz. Az app figyelmeztet, és felajánlja a garázst.'],
    ['Mi van, ha lejár az időm?', 'A beállított perccel előtte és lejáratkor értesítést kapsz; +15 perccel hosszabbíthatsz. Pótdíj akkor jár, ha lejárt jeggyel állsz ott.'],
    ['Működik internet nélkül?', 'Igen: az aktív jegy, a zónák és a már látott térkép mélygarázsban is látszik.'],
    ['Külföldi rendszámmal is jó?', 'Igen, az autó mentésekor válaszd ki az országot.'],
    ['Mennyire pontos a szabad hely esélye?', 'Becslés: a prototípusban szimulált, és ahol mások többször nem találtak helyet, ott kisebb. Valódi foglaltsági adat a várossal együttműködve jöhet.'],
    ['iPhone-on webappként nem szól az értesítés?', 'Mentsd a kezdőképernyőre (Megosztás → Főképernyőhöz adás), nyisd meg onnan, és az első parkolásnál engedélyezd az értesítést.'],
    ['Hogyan törlöm a fiókomat?', 'Menü → Fiók → Fiók törlése. Minden adatod azonnal törlődik.'],
  ] as QA[],
  // Akadálymentesség
  a11yBody: [
    'A Parkolj célja, hogy mindenki használhassa: a WCAG 2.1 AA szintet követjük. Minden gombnak van képernyőolvasó-neve, a színek világos és sötét módban is megfelelő kontrasztúak, a szöveg nagyítható.',
    'Ismert korlát: a térkép önmagában nem olvasható fel, ezért minden, ami a térképen van, szöveges listaként is megjelenik (javaslatok, zónák, árak).',
    'Ha valamit nem tudsz használni, írd meg a Visszajelzés küldése oldalon; minden ilyen jelzést elsőként javítunk.',
  ],
  // Licencek
  lic: [
    ['Térképadat', '© OpenStreetMap közreműködők, ODbL licenc'],
    ['Alaptérkép', 'OpenFreeMap, OpenMapTiles'],
    ['Zónahatárok', 'A fővárosi parkolási zónatérkép alapján (tájékoztató jellegű)'],
    ['Címkereső', 'Photon (komoot), OpenStreetMap-adatokkal'],
    ['Nyílt forrású szoftverek', 'React Native, Expo (MIT), MapLibre GL JS (BSD-3)'],
  ] as QA[],
};

type HelpStrings = typeof HU;

const EN: HelpStrings = {
  title: 'Information and help',
  sosTitle: 'Is it an emergency?',
  sosBody: 'In case of an accident, injury or danger, call the emergency number 112.',
  call: 'Call 112',
  carTitle: "Can't find your car?",
  carBody: 'First check the ticket on the Parkings tab: it shows where you left it (street, garage level, photo). If it is not there, call 112: the police can tell you if it was towed, or you can report a theft.',
  damageTitle: 'Was your car damaged while parked?',
  damageBody: 'If the other driver is there, fill in the European accident statement together and take photos. If they left or you disagree, call the police (112).',
  helpSection: 'Parkolj help and support',
  legend: 'Legend',
  features: 'Main features of the app',
  how: 'How mobile parking works',
  faq: 'Frequently asked questions',
  tourSub: 'A one-minute step-by-step walkthrough of an evening (also for a projector)',
  fbTitle: 'Feedback about the app',
  fbBody: 'Tell us what does not work or what you would do differently. We read every message.',
  fbBtn: 'Send feedback',
  citySection: 'Parking in Budapest',
  cityFbTitle: 'Wrong zone, price or sign?',
  cityFbBody: 'At payment, use “Wrong zone or price? Report it” to report anonymously; we share a summary of “No space” reports with the city. You can also send feedback about parking to the city transport authority.',
  cityLink: 'City parking information (bkk.hu)',
  docs: 'Documents',
  privacy: 'Privacy notice',
  terms: 'Beta terms of use',
  termsSoon: 'Full terms and conditions come before the paid launch',
  a11y: 'Accessibility statement',
  licenses: 'Licences and data sources',
  version: (v: string) => `Version: ${v} (prototype)`,
  about: 'About',
  aboutBody: 'Parking next to your destination in Budapest: it shows the closest, cheapest and surest space, navigates you there, and you pay by the minute. A side project of two Budapest developers; currently a prototype, preparing for a closed beta.',
  zonesTitle: 'Parking zones',
  zoneLine: (ft: number, h: string) => `${ft} Ft/hour · paid on weekdays ${h}`,
  mapTitle: 'Symbols on the map',
  marks: {
    dest: 'Where you are going (destination)',
    fastest: 'Option 1: street, close',
    cheapest: 'Option 2: street, cheaper',
    garage: 'Option 3: garage',
    here: '“Park here”: where you are now',
  },
  layerGarage: 'Underground garage, car park (map layer)',
  layerPr: 'P+R car park (free, at the city edge)',
  layerCharger: 'EV charger',
  me: 'Your position (GPS)',
  district: 'District boundary',
  chanceTitle: 'What does the chance colour mean?',
  chanceGood: 'Green: good chance of a free space (above 60%)',
  chanceMid: 'Orange: medium chance (40–60%)',
  chanceBad: 'Red: low chance (below 40%)',
  chanceNote: 'The chance is an estimate (simulated in the prototype); “No space” reports lower it.',
  badgesTitle: 'Labels on the options',
  badgeQuick: '⚡ Quickest: searching plus walking is the shortest here',
  badgeFull: 'Others often found no space here at this time',
  badgeGarage: 'Garage: guaranteed space, no 3-hour limit',
  feat: [
    ['search', 'Search for a destination', 'Theatre, cinema, address: three parking options next to it.'],
    ['map', 'Three options', 'Street close, street cheaper, garage; with price, chance and time to destination.'],
    ['external', 'Navigation', 'Hands over to Google Maps, Apple Maps or Waze in one tap.'],
    ['ticket', 'Start and stop', 'Billed by the minute, only for paid time; +15 minutes in one tap.'],
    ['bell', 'Expiry alerts', 'Alerts before and at expiry, and watches the 3-hour rule.'],
    ['car', 'Where did I park?', 'Garage level, note and photo on the ticket; walk back to the car.'],
    ['star', 'Favourites', 'Home, work, saved places and cars.'],
    ['receipt', 'Parkings', 'Active ticket, history, receipts, monthly summary.'],
    ['parking', 'Parkolj Plus', 'Automatic extension, monthly report.'],
  ],
  faqs: [
    ['Do I really pay in the app?', 'Not in the prototype: payment is a demo, nothing is charged. Real payment starts after the official reseller contract.'],
    ['How much do I pay?', 'By the minute, and only for paid time. If parking becomes free meanwhile (e.g. in the evening), we charge until then.'],
    ['What is the 3-hour rule?', 'In zones A, B and C you can park for at most 3 hours at a time. The app warns you and offers a garage.'],
    ['What if my time runs out?', 'You get a notification before and at expiry; extend by +15 minutes. A surcharge applies if you stay with an expired ticket.'],
    ['Does it work offline?', 'Yes: the active ticket, the zones and the map you already viewed show even in an underground garage.'],
    ['Does a foreign plate work?', 'Yes, choose the country when you save the car.'],
    ['How accurate is the chance of a free space?', 'It is an estimate: simulated in the prototype, and lower where others repeatedly found no space. Real occupancy data may come with the city.'],
    ['No notification on iPhone as a web app?', 'Add it to the Home Screen (Share → Add to Home Screen), open it from there and allow notifications at your first parking.'],
    ['How do I delete my account?', 'Menu → Account → Delete account. All your data is deleted immediately.'],
  ],
  a11yBody: [
    'Parkolj aims to be usable by everyone: we follow WCAG 2.1 level AA. Every button has a screen reader name, colours have sufficient contrast in light and dark mode, and text can be enlarged.',
    'Known limitation: the map itself cannot be read aloud, so everything on it is also shown as a text list (options, zones, prices).',
    'If you cannot use something, tell us on the Send feedback page; we fix these first.',
  ],
  lic: [
    ['Map data', '© OpenStreetMap contributors, ODbL licence'],
    ['Base map', 'OpenFreeMap, OpenMapTiles'],
    ['Zone boundaries', 'Based on the city parking zone map (for information only)'],
    ['Address search', 'Photon (komoot), with OpenStreetMap data'],
    ['Open source software', 'React Native, Expo (MIT), MapLibre GL JS (BSD-3)'],
  ],
};

const DE: HelpStrings = {
  title: 'Infos und Hilfe',
  sosTitle: 'Ist es ein Notfall?',
  sosBody: 'Bei Unfall, Verletzung oder Gefahr wähle den Notruf 112.',
  call: 'Anrufen: 112',
  carTitle: 'Findest du dein Auto nicht?',
  carBody: 'Sieh zuerst im Tab „Parkvorgänge“ auf dem Ticket nach: Dort steht, wo du es abgestellt hast (Straße, Garagenebene, Foto). Ist es dort nicht, ruf 112 an: Die Polizei sagt dir, ob es abgeschleppt wurde, oder du meldest den Diebstahl.',
  damageTitle: 'Wurde dein Auto beim Parken beschädigt?',
  damageBody: 'Ist der Verursacher da, füllt gemeinsam den Europäischen Unfallbericht aus und macht Fotos. Ist er weg oder seid ihr uneinig, ruf die Polizei (112).',
  helpSection: 'Parkolj Hilfe und Support',
  legend: 'Legende',
  features: 'Die wichtigsten Funktionen',
  how: 'So funktioniert Handyparken',
  faq: 'Häufige Fragen',
  tourSub: 'Eine einminütige Schritt-für-Schritt-Tour durch einen Abend (auch für den Beamer)',
  fbTitle: 'Feedback zur App',
  fbBody: 'Schreib uns, was nicht funktioniert oder was du anders machen würdest. Wir lesen jede Nachricht.',
  fbBtn: 'Feedback senden',
  citySection: 'Parken in Budapest',
  cityFbTitle: 'Falsche Zone, Preis oder Schild?',
  cityFbBody: 'Bei der Zahlung kannst du mit „Falsche Zone oder Preis? Melden“ anonym melden; eine Zusammenfassung der „Kein Platz“-Meldungen geben wir an die Stadt weiter. Rückmeldungen zum Parken nimmt auch die städtische Verkehrsbehörde entgegen.',
  cityLink: 'Parkinformationen der Stadt (bkk.hu)',
  docs: 'Dokumente',
  privacy: 'Datenschutzhinweis',
  terms: 'Beta-Nutzungsbedingungen',
  termsSoon: 'Vollständige AGB vor dem kostenpflichtigen Start',
  a11y: 'Erklärung zur Barrierefreiheit',
  licenses: 'Lizenzen und Datenquellen',
  version: (v: string) => `Version: ${v} (Prototyp)`,
  about: 'Über die App',
  aboutBody: 'Parken neben deinem Ziel in Budapest: zeigt den nächsten, günstigsten und sichersten Platz, navigiert dich hin, und du zahlst minutengenau. Ein eigenes Projekt zweier Budapester Entwickler; derzeit ein Prototyp, in Vorbereitung auf eine geschlossene Beta.',
  zonesTitle: 'Parkzonen',
  zoneLine: (ft: number, h: string) => `${ft} Ft/Std. · gebührenpflichtig werktags ${h}`,
  mapTitle: 'Zeichen auf der Karte',
  marks: {
    dest: 'Wohin du fährst (Ziel)',
    fastest: 'Vorschlag 1: Straße, nah',
    cheapest: 'Vorschlag 2: Straße, günstiger',
    garage: 'Vorschlag 3: Garage',
    here: '„Hier parken“: wo du gerade stehst',
  },
  layerGarage: 'Tiefgarage, Parkhaus (Kartenebene)',
  layerPr: 'P+R-Parkplatz (kostenlos, am Stadtrand)',
  layerCharger: 'Ladestation',
  me: 'Dein Standort (GPS)',
  district: 'Bezirksgrenze',
  chanceTitle: 'Was bedeutet die Farbe der Chance?',
  chanceGood: 'Grün: gute Chance auf einen freien Platz (über 60 %)',
  chanceMid: 'Orange: mittlere Chance (40–60 %)',
  chanceBad: 'Rot: geringe Chance (unter 40 %)',
  chanceNote: 'Die Chance ist eine Schätzung (im Prototyp simuliert); „Kein Platz“-Meldungen senken sie.',
  badgesTitle: 'Kennzeichnungen an den Vorschlägen',
  badgeQuick: '⚡ Am schnellsten: Suche und Fußweg zusammen sind hier am kürzesten',
  badgeFull: 'Andere fanden hier um diese Zeit oft keinen Platz',
  badgeGarage: 'Garage: sicherer Platz, keine 3-Stunden-Grenze',
  feat: [
    ['search', 'Zielsuche', 'Theater, Kino, Adresse: drei Parkmöglichkeiten daneben.'],
    ['map', 'Drei Vorschläge', 'Straße nah, Straße günstiger, Garage; mit Preis, Chance und Zeit bis zum Ziel.'],
    ['external', 'Navigation', 'Übergabe an Google Maps, Apple Karten oder Waze mit einem Tipp.'],
    ['ticket', 'Starten und beenden', 'Minutengenau, nur für gebührenpflichtige Zeit; +15 Minuten mit einem Tipp.'],
    ['bell', 'Ablaufwarnung', 'Erinnert vor und bei Ablauf und achtet auf die 3-Stunden-Regel.'],
    ['car', 'Wo steht mein Auto?', 'Garagenebene, Notiz und Foto auf dem Ticket; zu Fuß zurück zum Auto.'],
    ['star', 'Favoriten', 'Zuhause, Arbeit, gespeicherte Orte und Autos.'],
    ['receipt', 'Parkvorgänge', 'Aktives Ticket, Verlauf, Belege, Monatsübersicht.'],
    ['parking', 'Parkolj Plus', 'Automatische Verlängerung, Monatsbericht.'],
  ],
  faqs: [
    ['Zahle ich wirklich in der App?', 'Im Prototyp nicht: Die Zahlung ist eine Demo, es wird nichts belastet. Echte Zahlung startet nach dem offiziellen Wiederverkäufervertrag.'],
    ['Wie viel zahle ich?', 'Minutengenau und nur für die gebührenpflichtige Zeit. Wird es zwischendurch kostenlos (z. B. abends), berechnen wir nur bis dahin.'],
    ['Was ist die 3-Stunden-Regel?', 'In den Zonen A, B und C darfst du höchstens 3 Stunden am Stück parken. Die App warnt dich und schlägt eine Garage vor.'],
    ['Was, wenn meine Zeit abläuft?', 'Du bekommst vor und bei Ablauf eine Benachrichtigung; verlängere um +15 Minuten. Mit abgelaufenem Ticket droht eine Strafgebühr.'],
    ['Funktioniert es offline?', 'Ja: Das aktive Ticket, die Zonen und die schon gesehene Karte erscheinen auch in der Tiefgarage.'],
    ['Geht es mit ausländischem Kennzeichen?', 'Ja, wähle beim Speichern des Autos das Land.'],
    ['Wie genau ist die Chance auf einen freien Platz?', 'Eine Schätzung: im Prototyp simuliert und geringer, wo andere wiederholt keinen Platz fanden. Echte Belegungsdaten können mit der Stadt kommen.'],
    ['Keine Benachrichtigung auf dem iPhone als Web-App?', 'Füge sie zum Home-Bildschirm hinzu (Teilen → Zum Home-Bildschirm), öffne sie von dort und erlaube beim ersten Parken Benachrichtigungen.'],
    ['Wie lösche ich mein Konto?', 'Menü → Konto → Konto löschen. Alle Daten werden sofort gelöscht.'],
  ],
  a11yBody: [
    'Parkolj soll für alle nutzbar sein: Wir folgen WCAG 2.1 Stufe AA. Jede Schaltfläche hat einen Namen für Screenreader, die Farben haben im hellen und dunklen Modus ausreichenden Kontrast, Text lässt sich vergrößern.',
    'Bekannte Einschränkung: Die Karte selbst kann nicht vorgelesen werden, deshalb erscheint alles darauf auch als Textliste (Vorschläge, Zonen, Preise).',
    'Wenn du etwas nicht nutzen kannst, schreib uns über „Feedback senden“; solche Meldungen beheben wir zuerst.',
  ],
  lic: [
    ['Kartendaten', '© OpenStreetMap-Mitwirkende, ODbL-Lizenz'],
    ['Basiskarte', 'OpenFreeMap, OpenMapTiles'],
    ['Zonengrenzen', 'Nach der städtischen Parkzonenkarte (nur zur Information)'],
    ['Adresssuche', 'Photon (komoot), mit OpenStreetMap-Daten'],
    ['Open-Source-Software', 'React Native, Expo (MIT), MapLibre GL JS (BSD-3)'],
  ],
};

const S: Record<Lang, HelpStrings> = { hu: HU, en: EN, de: DE };

/** Körvonalas gomb (mint a BudapestGO „Hívás”, „Visszajelzés küldése” gombjai) */
function OutlineBtn({ icon, text, onPress, link }: { icon: IconName; text: string; onPress: () => void; link?: boolean }) {
  const col = isDark ? C.text : C.brand;
  return (
    <Pressable onPress={onPress} role={link ? 'link' : 'button'} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'flex-start', borderWidth: 2, borderColor: col, borderRadius: 14, paddingVertical: 9, paddingHorizontal: 16, marginTop: 12 }}>
      <Icon name={icon} size={20} color={col} />
      <Text style={{ color: col, fontWeight: '700', fontSize: 16 }}>{text}</Text>
    </Pressable>
  );
}

/** Kártya ikonnal, címmel és szöveggel (a súgó tetején és a visszajelzésnél) */
function InfoCard({ icon, title, body, children, last }: { icon: IconName; title: string; body: string; children?: ReactNode; last?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', gap: 14, padding: 16, borderBottomWidth: last ? 0 : 1, borderColor: C.line }}>
      <Icon name={icon} size={26} color={isDark ? C.text : C.brand} />
      <View style={{ flex: 1 }}>
        <Text role="heading" style={{ fontSize: 18, fontWeight: '800', color: titleColor() }}>
          {title}
        </Text>
        <Text style={{ color: C.sub, marginTop: 4, lineHeight: 20 }}>{body}</Text>
        {children}
      </View>
    </View>
  );
}

function Swatch({ color, glyph, round = true }: { color: string; glyph?: string; round?: boolean }) {
  return (
    <View style={{ width: 30, height: 30, borderRadius: round ? 15 : 8, backgroundColor: color, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#fff' }}>
      {!!glyph && <Text style={{ color: '#fff', fontWeight: '800', fontSize: glyph.length > 1 ? 10 : 13 }}>{glyph}</Text>}
    </View>
  );
}

function LegendRow({ mark, text, sub }: { mark: ReactNode; text: string; sub?: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 8 }}>
      <View style={{ width: 34, alignItems: 'center' }}>{mark}</View>
      <View style={{ flex: 1 }}>
        <Text style={{ color: C.text, fontSize: 16 }}>{text}</Text>
        {!!sub && <Text style={{ color: C.sub, fontSize: 13 }}>{sub}</Text>}
      </View>
    </View>
  );
}

const H2 = ({ children }: { children: string }) => (
  <Text role="heading" style={{ fontSize: 20, fontWeight: '800', color: titleColor(), marginTop: 18, marginBottom: 6 }}>
    {children}
  </Text>
);

function Legend({ s, t }: { s: HelpStrings; t: Strings }) {
  const hours = (h: [number, number] | null) => (h ? `${h[0]}–${h[1]}` : '–');
  return (
    <View testID="help-legend">
      <H2>{s.zonesTitle}</H2>
      {ZONES.map((z) => (
        <LegendRow key={z.id} mark={<View style={[styles.badge, { borderRadius: 10, backgroundColor: bgForWhite(z.color) }]}><Text style={{ color: '#fff', fontWeight: '800' }}>{z.id}</Text></View>} text={t.zoneOf(z.id)} sub={s.zoneLine(z.pricePerHour, hours(z.weekdayHours))} />
      ))}
      <H2>{s.mapTitle}</H2>
      {(['dest', 'fastest', 'cheapest', 'garage', 'here'] as const).map((k) => (
        <LegendRow key={k} mark={<Swatch color={MARKER_COLORS[k]} glyph={MARKER_GLYPH[k]} round={k !== 'garage'} />} text={s.marks[k]} />
      ))}
      <LegendRow mark={<Swatch color="#4A1466" glyph="P" round={false} />} text={s.layerGarage} />
      <LegendRow mark={<Swatch color="#1D4ED8" glyph="P+R" round={false} />} text={s.layerPr} />
      <LegendRow mark={<Swatch color="#0E9F6E" glyph="⚡" />} text={s.layerCharger} />
      <LegendRow mark={<View style={{ width: 18, height: 18, borderRadius: 9, backgroundColor: '#2563EB', borderWidth: 3, borderColor: '#fff' }} />} text={s.me} />
      <LegendRow mark={<View style={{ width: 30, borderTopWidth: 2, borderStyle: 'dashed', borderColor: C.sub }} />} text={s.district} />
      <H2>{s.chanceTitle}</H2>
      {(
        [
          [C.good, s.chanceGood],
          [C.warn, s.chanceMid],
          [C.danger, s.chanceBad],
        ] as [string, string][]
      ).map(([c, txt]) => (
        <LegendRow key={txt} mark={<View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: c }} />} text={txt} />
      ))}
      <Text style={{ color: C.sub, fontSize: 13, marginTop: 4 }}>{s.chanceNote}</Text>
      <H2>{s.badgesTitle}</H2>
      {[s.badgeQuick, s.badgeFull, s.badgeGarage].map((b) => (
        <Text key={b} style={{ color: C.text, fontSize: 16, marginVertical: 5 }}>
          • {b}
        </Text>
      ))}
    </View>
  );
}

export default function HelpScreen({ t, lang, district, onBack, openFeedback, openPrivacy, openTerms, initial = 'home' }: { t: Strings; lang: Lang; district?: string | null; onBack: () => void; openFeedback: () => void; openPrivacy: () => void; openTerms: () => void; initial?: 'home' | 'about' }) {
  const [sub, setSub] = useState<Sub>(initial);
  const [openQ, setOpenQ] = useState<number | null>(null);
  const s = S[lang] ?? HU;
  // A Névjegyből (ha közvetlenül nyílt meg) a menübe megy vissza, máshonnan a súgó főoldalára
  const home = () => (sub === 'about' && initial === 'about' ? onBack() : setSub('home'));

  if (sub === 'about')
    return (
      <View testID="help-about">
        <PageHeader title={s.about} onBack={home} />
        <View style={{ alignItems: 'center', paddingVertical: 12 }}>
          <View style={[styles.brandMark, { width: 64, height: 64, borderRadius: 32, borderWidth: 8 }]}>
            <Text style={{ color: C.brand, fontWeight: '900', fontSize: 22 }}>P</Text>
          </View>
          <Text style={{ fontSize: 28, letterSpacing: 3, color: titleColor(), marginTop: 12 }}>
            PARK<Text style={{ fontWeight: '900' }}>OLJ</Text>
          </Text>
          <Text style={{ color: C.sub, marginTop: 4 }}>{s.version(app.expo.version)}</Text>
        </View>
        <Text style={{ color: C.text, fontSize: 16, lineHeight: 23, marginVertical: 12 }}>{s.aboutBody}</Text>
        <Section>
          <ListRow icon="help" label={s.title} onPress={() => setSub('home')} />
          <ListRow label={s.privacy} onPress={openPrivacy} />
          <ListRow label={s.terms} onPress={openTerms} />
          <ListRow label={s.a11y} onPress={() => setSub('a11y')} />
          <ListRow label={s.licenses} onPress={() => setSub('licenses')} last />
        </Section>
      </View>
    );
  if (sub === 'legend')
    return (
      <View>
        <PageHeader title={s.legend} onBack={home} />
        <Legend s={s} t={t} />
      </View>
    );
  if (sub === 'how')
    return (
      <View>
        <PageHeader title={s.how} onBack={home} />
        <InfoScreen t={t} lang={lang} hideTitle district={district} />
      </View>
    );
  if (sub === 'features')
    return (
      <View>
        <PageHeader title={s.features} onBack={home} />
        <Section>
          {s.feat.map(([icon, title, body], i) => (
            <ListRow key={title} icon={icon} label={title} sub={body} last={i === s.feat.length - 1} />
          ))}
        </Section>
      </View>
    );
  if (sub === 'faq')
    return (
      <View>
        <PageHeader title={s.faq} onBack={home} />
        <Section>
          {s.faqs.map(([q, a], i) => (
            <View key={q} style={{ borderBottomWidth: i === s.faqs.length - 1 ? 0 : 1, borderColor: C.line }}>
              <Pressable onPress={() => setOpenQ(openQ === i ? null : i)} role="button" aria-expanded={openQ === i} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16 }}>
                <Text style={{ flex: 1, fontSize: 16, fontWeight: '700', color: C.text }}>{q}</Text>
                <View style={{ transform: [{ rotate: openQ === i ? '-90deg' : '90deg' }] }}>
                  <Icon name="chevron" size={18} color={C.sub} />
                </View>
              </Pressable>
              {openQ === i && <Text style={{ color: C.sub, paddingHorizontal: 16, paddingBottom: 16, marginTop: -6, lineHeight: 20 }}>{a}</Text>}
            </View>
          ))}
        </Section>
      </View>
    );
  if (sub === 'a11y')
    return (
      <View>
        <PageHeader title={s.a11y} onBack={home} />
        {s.a11yBody.map((p) => (
          <Text key={p} style={{ color: C.text, fontSize: 16, lineHeight: 23, marginBottom: 12 }}>
            {p}
          </Text>
        ))}
      </View>
    );
  if (sub === 'licenses')
    return (
      <View>
        <PageHeader title={s.licenses} onBack={home} />
        <Section>
          {s.lic.map(([k, v], i) => (
            <ListRow key={k} label={k} sub={v} last={i === s.lic.length - 1} />
          ))}
        </Section>
      </View>
    );

  return (
    <View testID="help-home">
      <PageHeader title={s.title} onBack={onBack} />
      <Section>
        <InfoCard icon="help" title={s.sosTitle} body={s.sosBody}>
          <OutlineBtn icon="external" text={s.call} onPress={() => Linking.openURL('tel:112')} link />
        </InfoCard>
        <InfoCard icon="car" title={s.carTitle} body={s.carBody} />
        <InfoCard icon="info" title={s.damageTitle} body={s.damageBody} last />
      </Section>

      <Section title={s.helpSection}>
        <ListRow icon="map" label={s.legend} onPress={() => setSub('legend')} />
        <ListRow icon="star" label={s.features} onPress={() => setSub('features')} />
        <ListRow icon="ticket" label={s.how} onPress={() => setSub('how')} />
        <ListRow icon="help" label={s.faq} onPress={() => setSub('faq')} />
        {Platform.OS === 'web' && typeof window !== 'undefined' && <ListRow icon="map" label={TOUR_UI[lang].start} sub={s.tourSub} onPress={() => window.location.assign(window.location.pathname + '?bemutato')} />}
        <InfoCard icon="chat" title={s.fbTitle} body={s.fbBody} last>
          <OutlineBtn icon="chat" text={s.fbBtn} onPress={openFeedback} />
        </InfoCard>
      </Section>

      <Section title={s.citySection}>
        <InfoCard icon="parking" title={s.cityFbTitle} body={s.cityFbBody} last>
          <OutlineBtn icon="external" text={s.cityLink} onPress={() => Linking.openURL('https://bkk.hu/')} link />
        </InfoCard>
      </Section>

      <Section title={s.docs}>
        <ListRow label={s.privacy} onPress={openPrivacy} />
        <ListRow label={s.terms} sub={s.termsSoon} onPress={openTerms} />
        <ListRow label={s.a11y} onPress={() => setSub('a11y')} />
        <ListRow label={s.licenses} onPress={() => setSub('licenses')} last />
      </Section>
      <Text style={{ textAlign: 'center', color: C.sub, marginTop: 4, marginBottom: 12 }}>{s.version(app.expo.version)}</Text>
    </View>
  );
}
