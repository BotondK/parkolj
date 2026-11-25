import { Text, View } from 'react-native';
import { PageHeader } from '../components/kit';
import { C, isDark } from '../components/ui';
import type { Lang } from '../i18n';

// Adatkezelési tájékoztató a zárt bétához. TERVEZET: indulás előtt jogásznak át kell néznie,
// és a [ ] helyekre a cég adatai kerülnek (a Kft. megalakulása után).
type Block = [title: string, body: string];

const HU: { title: string; draft: string; blocks: Block[] } = {
  title: 'Adatkezelési tájékoztató',
  draft: 'Tervezet a zárt bétához, jogi átnézés előtt. Utolsó módosítás: 2026. november 23.',
  blocks: [
    ['Ki kezeli az adataidat?', 'A Parkolj üzemeltetője: [cégnév, székhely, cégjegyzékszám]. Kapcsolat: [e-mail cím]. Adatvédelmi kérdésben is itt érsz el minket.'],
    [
      'Milyen adatokat tárolunk?',
      'Fiók nélkül minden adat csak a készülékeden marad. Ha belépsz, ezek kerülnek a fiókodba: e-mail cím, név, autók (rendszám, országkód), kedvenc helyek, parkolási előzmények (hely, zóna, idő, díj), az aktív parkolás, beállítások, számlázási profilok (név, cím, céges adószám). Bankkártyából csak a márkát, az utolsó 4 számjegyet és a lejáratot tároljuk, a teljes számot és a CVC-t soha.',
    ],
    ['Fotó az autó helyéről', 'Ha fotót készítesz vagy választasz arról, hol hagytad az autót, az csak a készülékeden marad, nem kerül a szerverre és a fiókodba sem. A következő parkolás indításakor törlődik, vagy bármikor törölheted. A „Nem volt hely” és „Hibás zóna vagy ár” jelzés névtelen: a hely kb. 100 m pontossággal, rendszám és fiók nélkül kerül hozzánk. Ugyanígy névtelen a leállítás utáni „Mennyi ideig kerestél helyet?” válasz is.'],
    ['Helyadatok', 'A GPS-helyzetedet csak a készüléken használjuk (térkép, „Parkolás itt”, vissza az autóhoz). A szerverre csak az a hely kerül, ahol parkolást indítasz.'],
    ['Értesítés bezárt webappnál', 'Ha a webappban engedélyezed az értesítéseket, a parkolás indításakor elküldjük a szervernek, mikor kell szólni (a lejárat előtt és lejáratkor), a böngésződ értesítési címével és az értesítés szövegével. Rendszám, hely és fiók nincs benne; kiküldés vagy leállítás után azonnal törlődik. Jogalap: a szolgáltatás nyújtása.'],
    ['Névtelen használati statisztika', 'A zárt béta alatt névtelenül számoljuk, hány keresésből lesz navigáció, indítás és leállítás (esemény neve, ideje, nyelv, platform, zóna betűjele, időtartam). Nincs benne név, e-mail, rendszám vagy pontos hely, és nem kötjük a fiókodhoz; egy alkalmon belül egy véletlen azonosító köti össze a lépéseket. A Beállításokban kikapcsolható. Ha az app összeomlik, ugyanígy névtelen hibajelentést küldünk (a hiba típusa és helye a kódban, képernyő, verzió); a hibaüzenetből a rendszámot, e-mailt, számokat és helyet kiszűrjük. Ezt is ugyanaz a kapcsoló tiltja le. Jogalap: jogos érdek (az app fejlesztése).'],
    ['Jelentkezés a bétára', 'Ha a jelentkezési oldalon (?beta) feliratkozol, az e-mail címedet, a telefonod típusát, a parkolási szokásodat (milyen gyakran, lakóként, ingázóként vagy látogatóként) és a nyelvet tároljuk, kizárólag a béta meghívóhoz. A béta végén töröljük, előbb is bármikor kérheted. Jogalap: hozzájárulás (6. cikk (1) a)), amelyet bármikor visszavonhatsz.'],
    ['Visszajelzés', 'Ha visszajelzést küldesz, a szöveget, az értékelést és néhány technikai adatot (verzió, platform, nyelv, képernyőszélesség, téma) tárolunk. Belépve a fiókodhoz kötjük.'],
    [
      'Miért és milyen jogalapon?',
      'A fiók és a szinkron a szolgáltatás nyújtásához kell (szerződés teljesítése, GDPR 6. cikk (1) b)). A visszajelzést önkéntesen küldöd, az app fejlesztésére használjuk (jogos érdek, 6. cikk (1) f)). Számlázási adatot a számviteli törvény szerint őrzünk meg.',
    ],
    [
      'Kik férnek hozzá (adatfeldolgozók)?',
      'Supabase (adatbázis és belépés, EU-s szerver, Frankfurt). GitHub Pages (a webes app tárhelye). OpenFreeMap (térképcsempék). Photon / komoot (címkeresés: a beírt keresőszöveget kapja meg). Élesben a fizetési szolgáltató és az NMFR. Adatot nem adunk el, és nem használunk hirdetési követést.',
    ],
    ['Meddig?', 'Amíg a fiókod él. A fiók törlésekor (Menü → Fiók → Fiók törlése) minden adatod azonnal törlődik, kivéve amit a számviteli törvény miatt meg kell őrizni (8 év).'],
    [
      'A jogaid',
      'Kérheted az adataid másolatát, javítását, törlését, a kezelés korlátozását, és tiltakozhatsz. A parkolási előzményeidet a Plusz havi kimutatásából CSV-ben is letöltheted. Panasszal a Nemzeti Adatvédelmi és Információszabadság Hatósághoz (NAIH, naih.hu) fordulhatsz, vagy bírósághoz.',
    ],
  ],
};

const EN: typeof HU = {
  title: 'Privacy notice',
  draft: 'Draft for the closed beta, before legal review. Last updated: 23 November 2026.',
  blocks: [
    ['Who handles your data?', 'Parkolj is operated by [company name, registered office, company number]. Contact: [email address], also for privacy questions.'],
    [
      'What we store',
      'Without an account everything stays on your device. When you sign in, your account holds: email, name, cars (plate, country code), favourite places, parking history (place, zone, time, fee), the active parking, settings and billing profiles (name, address, company tax number). For bank cards we only keep the brand, the last 4 digits and the expiry date, never the full number or the CVC.',
    ],
    ['Photo of your parking spot', 'If you take or choose a photo of where you left the car, it stays on your device only; it is not sent to the server or stored in your account. It is deleted when you start your next parking, or you can delete it any time. “No space” and “Wrong zone or price” reports are anonymous: the location to about 100 m, with no plate or account. Your answer to “How long did you look for a space?” after stopping is anonymous in the same way.'],
    ['Location', 'Your GPS position is used on your device only (map, “Park here”, back to my car). Only the place where you start a parking is sent to the server.'],
    ['Notifications when the web app is closed', 'If you allow notifications in the web app, when you start parking we send the server when to alert you (before and at expiry), together with your browser\'s notification address and the notification text. It contains no plate, location or account and is deleted right after sending or when you stop. Legal basis: providing the service.'],
    ['Anonymous usage statistics', 'During the closed beta we anonymously count how many searches turn into navigation, start and stop (event name, time, language, platform, zone letter, duration). It contains no name, email, plate or exact location and is not linked to your account; a random ID connects the steps within one visit. You can turn it off in Settings. If the app crashes, we likewise send an anonymous error report (error type, place in the code, screen, version); plate, email, numbers and location are removed from the error message. The same switch turns this off. Legal basis: legitimate interest (improving the app).'],
    ['Beta sign-up', 'If you sign up on the beta page (?beta) we store your email, phone type, parking habit (how often; resident, commuter or visitor) and language, only to invite you to the beta. We delete it when the beta ends, or earlier at your request. Legal basis: consent (Art. 6(1)(a)), which you can withdraw at any time.'],
    ['Feedback', 'If you send feedback we store the text, the rating and some technical details (version, platform, language, screen width, theme). When signed in it is linked to your account.'],
    ['Why and on what legal basis', 'The account and sync are needed to provide the service (contract, GDPR Art. 6(1)(b)). Feedback is voluntary and used to improve the app (legitimate interest, Art. 6(1)(f)). Billing data is kept as required by accounting law.'],
    [
      'Who can access it (processors)',
      'Supabase (database and sign-in, EU server in Frankfurt). GitHub Pages (hosting of the web app). OpenFreeMap (map tiles). Photon / komoot (address search: receives what you type). In production, the payment provider and NMFR. We do not sell data and use no advertising trackers.',
    ],
    ['How long', 'As long as your account exists. Deleting your account (Menu → Account → Delete account) removes all your data at once, except what accounting law requires us to keep (8 years).'],
    [
      'Your rights',
      'You can ask for a copy, correction or deletion of your data, restrict processing, or object. You can download your parking history as CSV from the Plus monthly report. You can complain to the Hungarian data protection authority (NAIH, naih.hu) or go to court.',
    ],
  ],
};

const DE: typeof HU = {
  title: 'Datenschutzhinweis',
  draft: 'Entwurf für die geschlossene Beta, vor rechtlicher Prüfung. Zuletzt geändert: 23. November 2026.',
  blocks: [
    ['Wer verarbeitet deine Daten?', 'Parkolj wird betrieben von [Firmenname, Sitz, Handelsregisternummer]. Kontakt: [E-Mail-Adresse], auch für Datenschutzfragen.'],
    [
      'Was wir speichern',
      'Ohne Konto bleiben alle Daten auf deinem Gerät. Wenn du dich anmeldest, enthält dein Konto: E-Mail, Name, Autos (Kennzeichen, Ländercode), Lieblingsorte, Parkverlauf (Ort, Zone, Zeit, Gebühr), den aktiven Parkvorgang, Einstellungen und Rechnungsprofile (Name, Adresse, Steuernummer der Firma). Von Bankkarten speichern wir nur Marke, die letzten 4 Ziffern und das Ablaufdatum, nie die vollständige Nummer oder die CVC.',
    ],
    ['Foto vom Parkplatz', 'Wenn du ein Foto machst oder auswählst, wo dein Auto steht, bleibt es nur auf deinem Gerät, es geht weder an den Server noch in dein Konto. Es wird beim nächsten Parkvorgang gelöscht, oder du löschst es jederzeit selbst. Meldungen „Kein Platz frei“ und „Falsche Zone oder Preis“ sind anonym: der Ort auf etwa 100 m genau, ohne Kennzeichen und Konto. Ebenso anonym ist die Antwort auf „Wie lange hast du einen Platz gesucht?“ nach dem Beenden.'],
    ['Standort', 'Deine GPS-Position wird nur auf deinem Gerät verwendet (Karte, „Hier parken“, zurück zum Auto). An den Server geht nur der Ort, an dem du einen Parkvorgang startest.'],
    ['Benachrichtigung bei geschlossener Web-App', 'Wenn du in der Web-App Benachrichtigungen erlaubst, senden wir beim Parkstart an den Server, wann wir dich erinnern sollen (vor und bei Ablauf), zusammen mit der Benachrichtigungsadresse deines Browsers und dem Text. Ohne Kennzeichen, Ort und Konto; nach dem Senden oder beim Beenden sofort gelöscht. Rechtsgrundlage: Erbringung des Dienstes.'],
    ['Anonyme Nutzungsstatistik', 'Während der geschlossenen Beta zählen wir anonym, wie viele Suchen zu Navigation, Start und Ende führen (Ereignisname, Zeit, Sprache, Plattform, Zonenbuchstabe, Dauer). Sie enthält keinen Namen, keine E-Mail, kein Kennzeichen und keinen genauen Ort und wird nicht mit deinem Konto verknüpft; eine zufällige ID verbindet die Schritte innerhalb eines Besuchs. In den Einstellungen abschaltbar. Stürzt die App ab, senden wir ebenso einen anonymen Fehlerbericht (Fehlerart, Stelle im Code, Bildschirm, Version); Kennzeichen, E-Mail, Zahlen und Ort werden aus der Fehlermeldung entfernt. Derselbe Schalter schaltet dies ab. Rechtsgrundlage: berechtigtes Interesse (Verbesserung der App).'],
    ['Anmeldung zur Beta', 'Wenn du dich auf der Beta-Seite (?beta) anmeldest, speichern wir deine E-Mail, den Telefontyp, deine Parkgewohnheit (wie oft; Anwohner, Pendler oder Besucher) und die Sprache, nur für die Beta-Einladung. Am Ende der Beta löschen wir sie, auf Wunsch früher. Rechtsgrundlage: Einwilligung (Art. 6 Abs. 1 lit. a), jederzeit widerrufbar.'],
    ['Feedback', 'Wenn du Feedback sendest, speichern wir Text, Bewertung und einige technische Angaben (Version, Plattform, Sprache, Bildschirmbreite, Design). Angemeldet wird es mit deinem Konto verknüpft.'],
    ['Warum und auf welcher Rechtsgrundlage', 'Konto und Synchronisierung sind für den Dienst nötig (Vertrag, DSGVO Art. 6 Abs. 1 lit. b). Feedback ist freiwillig und dient der Verbesserung der App (berechtigtes Interesse, Art. 6 Abs. 1 lit. f). Rechnungsdaten bewahren wir nach dem Rechnungslegungsrecht auf.'],
    [
      'Wer hat Zugriff (Auftragsverarbeiter)',
      'Supabase (Datenbank und Anmeldung, EU-Server in Frankfurt). GitHub Pages (Hosting der Web-App). OpenFreeMap (Kartenkacheln). Photon / komoot (Adresssuche: erhält deine Eingabe). Im Echtbetrieb der Zahlungsdienstleister und NMFR. Wir verkaufen keine Daten und nutzen kein Werbe-Tracking.',
    ],
    ['Wie lange', 'Solange dein Konto besteht. Beim Löschen des Kontos (Menü → Mein Konto → Konto löschen) werden alle deine Daten sofort gelöscht, außer was das Rechnungslegungsrecht aufzubewahren verlangt (8 Jahre).'],
    [
      'Deine Rechte',
      'Du kannst Auskunft, Berichtigung oder Löschung deiner Daten verlangen, die Verarbeitung einschränken oder widersprechen. Deinen Parkverlauf kannst du als CSV aus dem Plus-Monatsbericht herunterladen. Beschwerden kannst du bei der ungarischen Datenschutzbehörde (NAIH, naih.hu) einreichen oder vor Gericht bringen.',
    ],
  ],
};

export default function PrivacyScreen({ lang, onBack }: { lang: Lang; onBack: () => void }) {
  const d = lang === 'en' ? EN : lang === 'de' ? DE : HU;
  return (
    <View>
      <PageHeader title={d.title} onBack={onBack} />
      <Text style={{ color: C.warn, fontSize: 13, marginBottom: 14 }}>{d.draft}</Text>
      <View style={{ backgroundColor: C.card, borderRadius: 18, borderWidth: isDark ? 0 : 1, borderColor: C.line, padding: 16, gap: 16 }}>
        {d.blocks.map(([title, body]) => (
          <View key={title} style={{ gap: 4 }}>
            <Text style={{ fontWeight: '800', fontSize: 16, color: C.text }}>{title}</Text>
            <Text style={{ color: C.text, fontSize: 14, lineHeight: 21 }}>{body}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}
