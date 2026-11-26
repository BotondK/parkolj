// Bemutató mód (?bemutato): egy perc alatt végigvezet egy estén (színház a belvárosban), lépésenként felirattal.
// A BKK-nak, befektetőknek, pályázatnak szóló bemutatóhoz: kivetítőn vagy telefonon, kattintásra halad.
import type { Lang } from '../i18n';

export type TourStepId = 'intro' | 'options' | 'garage' | 'navigate' | 'pay' | 'active' | 'stop' | 'city';
export const TOUR_STEPS: TourStepId[] = ['intro', 'options', 'garage', 'navigate', 'pay', 'active', 'stop', 'city'];

type T = { title: string; body: string };
const HU: Record<TourStepId, T> = {
  intro: { title: 'Parkolj bemutató', body: 'Egy perc alatt végigmegyünk egy estén: színházba megyünk a belvárosba, autóval. Lépj tovább a gombbal.' },
  options: { title: '1. Hova mész?', body: 'Beírod a célt (most: Operaház). Az app a célod köré 3 lehetőséget ad: utcán közel, utcán olcsóbb, garázs, árral, szabad hely eséllyel és idővel a célig.' },
  garage: { title: '2. Garázs, ha sokáig maradsz', body: 'Az utcán a belvárosban legfeljebb 3 órát parkolhatsz. Az előadás végéig tartó parkolásnál a garázs biztos hely, korlát nélkül.' },
  navigate: { title: '3. Odanavigál', body: 'Egy gombbal átadja a Google Mapsnek, Apple Térképnek vagy Waze-nek. Ha nem volt hely, egy koppintás, és jön a következő javaslat. Ebből tanul a rendszer.' },
  pay: { title: '4. Megérkeztél', body: 'Rendszám, időtartam, percre pontos díj, csak a fizetős időre. Ha nincs net, SMS-es tartalék is van.' },
  active: { title: '5. Fut a jegy', body: 'Visszaszámlálás, +15 perc egy koppintással, figyelmeztetés lejárat előtt, és figyel a 3 órás szabályra. (A bemutatóban 1 másodperc = 1 perc.)' },
  stop: { title: '6. Leállítás', body: 'Csak a ténylegesen használt időt fizeted. Egy névtelen koppintás: mennyi ideig kerestél helyet? Ebből lesz valódi adat a körözésről.' },
  city: { title: '7. A városnak', body: 'Névtelen, összesített adat: kereslet zónánként és óránként, keresési idő, és hol nem találnak helyet a sofőrök. Személyes adat nélkül, nyílt formátumban.' },
};
const EN: Record<TourStepId, T> = {
  intro: { title: 'Parkolj demo', body: 'In one minute we walk through an evening: driving to a theatre in the city centre. Use the button to continue.' },
  options: { title: '1. Where to?', body: 'You type the destination (here: the Opera). The app gives 3 options around it: street close, street cheaper, garage, with price, chance of a free space and time to the destination.' },
  garage: { title: '2. Garage for a long stay', body: 'Street parking in the centre is limited to 3 hours. For a parking that lasts until the end of the show, the garage is a sure space with no limit.' },
  navigate: { title: '3. Navigation', body: 'One tap hands over to Google Maps, Apple Maps or Waze. If there was no space, one tap brings the next option, and the system learns from it.' },
  pay: { title: '4. You have arrived', body: 'Plate, duration, billed by the minute and only for paid time. Without internet there is an SMS fallback.' },
  active: { title: '5. The ticket is running', body: 'Countdown, +15 minutes in one tap, alert before expiry, and it watches the 3-hour rule. (In the demo 1 second = 1 minute.)' },
  stop: { title: '6. Stop', body: 'You only pay for the time used. One anonymous tap: how long did you look for a space? This becomes real data on cruising.' },
  city: { title: '7. For the city', body: 'Anonymous, aggregated data: demand by zone and hour, search time, and where drivers find no space. No personal data, open format.' },
};
const DE: Record<TourStepId, T> = {
  intro: { title: 'Parkolj-Demo', body: 'In einer Minute gehen wir einen Abend durch: mit dem Auto ins Theater in der Innenstadt. Weiter mit der Schaltfläche.' },
  options: { title: '1. Wohin?', body: 'Du gibst das Ziel ein (hier: die Oper). Die App zeigt 3 Möglichkeiten: Straße nah, Straße günstiger, Garage, mit Preis, Chance auf einen freien Platz und Zeit bis zum Ziel.' },
  garage: { title: '2. Garage für längeres Bleiben', body: 'Auf der Straße darf man in der Innenstadt höchstens 3 Stunden parken. Bis zum Ende der Vorstellung ist die Garage der sichere Platz ohne Grenze.' },
  navigate: { title: '3. Navigation', body: 'Ein Tipp übergibt an Google Maps, Apple Karten oder Waze. War kein Platz frei, bringt ein Tipp den nächsten Vorschlag, und das System lernt daraus.' },
  pay: { title: '4. Angekommen', body: 'Kennzeichen, Dauer, minutengenau und nur für gebührenpflichtige Zeit. Ohne Internet gibt es SMS als Ersatz.' },
  active: { title: '5. Das Ticket läuft', body: 'Countdown, +15 Minuten mit einem Tipp, Warnung vor Ablauf, und es achtet auf die 3-Stunden-Regel. (In der Demo 1 Sekunde = 1 Minute.)' },
  stop: { title: '6. Beenden', body: 'Du zahlst nur die genutzte Zeit. Ein anonymer Tipp: Wie lange hast du gesucht? Daraus werden echte Daten zum Parksuchverkehr.' },
  city: { title: '7. Für die Stadt', body: 'Anonyme, zusammengefasste Daten: Nachfrage nach Zone und Stunde, Suchzeit und wo Fahrer keinen Platz finden. Ohne personenbezogene Daten, offenes Format.' },
};
export const TOUR_TEXT: Record<Lang, Record<TourStepId, T>> = { hu: HU, en: EN, de: DE };
export const TOUR_UI: Record<Lang, { next: string; close: string; again: string; city: string; start: string }> = {
  hu: { next: 'Tovább', close: 'Bemutató bezárása', again: 'Újra', city: 'A városnak szóló oldal', start: 'Bemutató indítása' },
  en: { next: 'Next', close: 'Close demo', again: 'Again', city: 'Page for the city', start: 'Start demo' },
  de: { next: 'Weiter', close: 'Demo schließen', again: 'Nochmal', city: 'Seite für die Stadt', start: 'Demo starten' },
};
