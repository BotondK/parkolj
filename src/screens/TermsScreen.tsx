import { Text, View } from 'react-native';
import { PageHeader } from '../components/kit';
import { C, isDark } from '../components/ui';
import type { Lang } from '../i18n';

// Felhasználási feltételek a zárt bétához (a teljes ÁSZF a fizetős indulás előtt készül el).
// TERVEZET: jogásznak át kell néznie, a [ ] helyekre a cég adatai kerülnek (a Kft. megalakulása után).
type Block = [title: string, body: string];
export type TermsDoc = { title: string; draft: string; blocks: Block[] };

const HU: TermsDoc = {
  title: 'Béta felhasználási feltételek',
  draft: 'Tervezet a zárt bétához, jogi átnézés előtt. A teljes ÁSZF a fizetős indulás előtt készül el. Utolsó módosítás: 2026. november 26.',
  blocks: [
    ['Kik vagyunk?', 'A Parkolj alkalmazást a [cégnév, székhely, cégjegyzékszám, adószám] üzemelteti. Kapcsolat: [e-mail cím]. A béta alatt az alkalmazás ingyenes, kipróbálásra szolgál.'],
    ['Mi a béta?', 'A béta az alkalmazás tesztváltozata. Hibák előfordulhatnak, a funkciók változhatnak, és a szolgáltatás előzetes értesítés nélkül szünetelhet vagy véget érhet. A béta végén a fiókod megmarad, ha nem törlöd.'],
    ['A fizetés a bétában nem valódi', 'A bétában a parkolási díj fizetése bemutató jellegű: pénz nem mozog, és az alkalmazás nem vált ki parkolójegyet. A tényleges parkolási díjat továbbra is a megszokott módon kell megfizetned (parkolóautomata, mobilparkolási szolgáltató, SMS). Az ebből eredő pótdíjért a Parkolj nem felel. Erre az alkalmazás a fizetésnél is figyelmeztet.'],
    ['A javaslatok tájékoztató jellegűek', 'A zónák, díjak, díjfizetési idők és korlátok a Fővárosi Önkormányzat hivatalos adataiból származnak, de tévedés előfordulhat. Mindig a helyszíni táblák és a hivatalos rendelet az irányadók. A szabad hely esélye és a keresési idő becslés, nem garancia. A garázsok adatai tájékoztató jellegűek.'],
    ['Biztonságos használat', 'Vezetés közben ne kezeld az alkalmazást. A navigációt átadjuk a térképalkalmazásodnak; a közlekedési szabályok és a jelzőtáblák mindig előbbre valók.'],
    ['Parkolj Plusz a bétában', 'A béta alatt a Parkolj Plusz funkciói díjmentesen használhatók. A fizetős indulás előtt értesítünk az árakról; automatikusan semmiért nem kell fizetned.'],
    ['Fiók és adatok', 'A fiókod és a belépési adataid védelméért te felelsz. Fiók nélkül is használhatod az alkalmazást; ekkor minden adat a készülékeden marad. Hogy milyen adatot kezelünk és miért, azt az Adatkezelési tájékoztató írja le. A fiókodat bármikor törölheted (Menü → Fiók → Fiók törlése).'],
    ['Visszajelzés', 'A visszajelzéseid, a „Nem volt hely” és a „Mennyi ideig kerestél?” válaszok segítenek az app és a városi parkolás fejlesztésében. A névtelen, összesített adatokat (például keresési idő zónánként) a várossal és nyilvánosan is megoszthatjuk; ezekből senki nem azonosítható.'],
    ['Felelősség', 'A béta ingyenes tesztszolgáltatás. A jogszabályok által megengedett mértékig nem felelünk a béta hibájából vagy kieséséből eredő kárért. Ez nem érinti a szándékosan vagy súlyos gondatlansággal okozott kárért, illetve az életet, testi épséget, egészséget megkárosító szerződésszegésért való felelősséget.'],
    ['Változás és befejezés', 'A feltételeket módosíthatjuk; a lényeges változásról az alkalmazásban értesítünk. A bétából bármikor kiléphetsz az alkalmazás törlésével és a fiókod törlésével.'],
    ['Irányadó jog, panasz', 'A magyar jog az irányadó. Panaszodat a [e-mail cím] címre küldheted, 30 napon belül válaszolunk. Fogyasztóként a lakóhelyed szerinti békéltető testülethez is fordulhatsz.'],
  ],
};

const EN: TermsDoc = {
  title: 'Beta terms of use',
  draft: 'Draft for the closed beta, before legal review. The full terms and conditions come before the paid launch. Last updated: 26 November 2026.',
  blocks: [
    ['Who we are', 'Parkolj is operated by [company name, registered office, company number, tax number]. Contact: [email address]. During the beta the app is free and meant for testing.'],
    ['What the beta is', 'The beta is a test version of the app. Errors can happen, features may change, and the service may pause or end without notice. Your account stays after the beta unless you delete it.'],
    ['Payment in the beta is not real', 'In the beta, paying the parking fee is a demonstration: no money moves and the app does not buy a parking ticket. You still need to pay the actual parking fee the usual way (parking meter, mobile parking provider, SMS). Parkolj is not liable for any penalty fee resulting from this. The app also warns you about this when you pay.'],
    ['Suggestions are for information', 'Zones, prices, paid hours and limits come from the official data of the Budapest municipality, but mistakes are possible. The signs on site and the official decree always prevail. The chance of a free space and the search time are estimates, not guarantees. Garage details are for information only.'],
    ['Safe use', 'Do not use the app while driving. Navigation is handed over to your map app; traffic rules and road signs always come first.'],
    ['Parkolj Plus in the beta', 'During the beta, Parkolj Plus features are free. We will tell you the prices before the paid launch; you will never be charged automatically.'],
    ['Account and data', 'You are responsible for keeping your account and sign-in details safe. You can use the app without an account; then all data stays on your device. The privacy notice explains what data we handle and why. You can delete your account at any time (Menu → My account → Delete account).'],
    ['Feedback', 'Your feedback, “No space” reports and “How long did you look?” answers help improve the app and parking in the city. We may share anonymous, aggregated data (for example search time by zone) with the city and publicly; no one can be identified from it.'],
    ['Liability', 'The beta is a free test service. To the extent permitted by law, we are not liable for damage caused by errors or outages of the beta. This does not limit liability for damage caused intentionally or by gross negligence, or for harm to life, body or health.'],
    ['Changes and ending', 'We may change these terms; we will tell you about important changes in the app. You can leave the beta at any time by deleting the app and your account.'],
    ['Governing law, complaints', 'Hungarian law applies. Send complaints to [email address]; we reply within 30 days. As a consumer you can also turn to the conciliation body of your place of residence.'],
  ],
};

const DE: TermsDoc = {
  title: 'Beta-Nutzungsbedingungen',
  draft: 'Entwurf für die geschlossene Beta, vor rechtlicher Prüfung. Die vollständigen AGB kommen vor dem kostenpflichtigen Start. Zuletzt geändert: 26. November 2026.',
  blocks: [
    ['Wer wir sind', 'Parkolj wird betrieben von [Firmenname, Sitz, Firmenbuchnummer, Steuernummer]. Kontakt: [E-Mail-Adresse]. Während der Beta ist die App kostenlos und zum Testen gedacht.'],
    ['Was die Beta ist', 'Die Beta ist eine Testversion der App. Fehler können vorkommen, Funktionen können sich ändern, und der Dienst kann ohne Ankündigung pausieren oder enden. Dein Konto bleibt nach der Beta bestehen, wenn du es nicht löschst.'],
    ['Die Zahlung in der Beta ist nicht echt', 'In der Beta ist das Bezahlen der Parkgebühr eine Vorführung: Es fließt kein Geld, und die App löst kein Parkticket. Die tatsächliche Parkgebühr musst du weiterhin wie gewohnt bezahlen (Parkautomat, Handyparken-Anbieter, SMS). Für daraus entstehende Strafgebühren haftet Parkolj nicht. Die App weist dich beim Bezahlen auch darauf hin.'],
    ['Vorschläge dienen der Information', 'Zonen, Preise, gebührenpflichtige Zeiten und Grenzen stammen aus den offiziellen Daten der Stadt Budapest, Fehler sind aber möglich. Maßgeblich sind immer die Schilder vor Ort und die offizielle Verordnung. Die Chance auf einen freien Platz und die Suchzeit sind Schätzungen, keine Garantie. Garagenangaben dienen nur der Information.'],
    ['Sichere Nutzung', 'Bediene die App nicht während der Fahrt. Die Navigation wird an deine Karten-App übergeben; Verkehrsregeln und Verkehrszeichen gehen immer vor.'],
    ['Parkolj Plus in der Beta', 'Während der Beta sind die Funktionen von Parkolj Plus kostenlos. Vor dem kostenpflichtigen Start informieren wir dich über die Preise; es wird nie automatisch etwas abgebucht.'],
    ['Konto und Daten', 'Für den Schutz deines Kontos und deiner Zugangsdaten bist du verantwortlich. Du kannst die App auch ohne Konto nutzen; dann bleiben alle Daten auf deinem Gerät. Welche Daten wir verarbeiten und warum, steht im Datenschutzhinweis. Du kannst dein Konto jederzeit löschen (Menü → Mein Konto → Konto löschen).'],
    ['Rückmeldungen', 'Deine Rückmeldungen, „Kein Platz“-Meldungen und Antworten auf „Wie lange hast du gesucht?“ helfen, die App und das Parken in der Stadt zu verbessern. Anonyme, zusammengefasste Daten (zum Beispiel Suchzeit je Zone) können wir mit der Stadt und öffentlich teilen; niemand ist daraus erkennbar.'],
    ['Haftung', 'Die Beta ist ein kostenloser Testdienst. Soweit gesetzlich zulässig, haften wir nicht für Schäden durch Fehler oder Ausfälle der Beta. Die Haftung für vorsätzlich oder grob fahrlässig verursachte Schäden sowie für Schäden an Leben, Körper oder Gesundheit bleibt unberührt.'],
    ['Änderungen und Ende', 'Wir können diese Bedingungen ändern; über wesentliche Änderungen informieren wir dich in der App. Du kannst die Beta jederzeit verlassen, indem du die App und dein Konto löschst.'],
    ['Anwendbares Recht, Beschwerden', 'Es gilt ungarisches Recht. Beschwerden schickst du an [E-Mail-Adresse]; wir antworten innerhalb von 30 Tagen. Als Verbraucher kannst du dich auch an die Schlichtungsstelle deines Wohnorts wenden.'],
  ],
};

export const TERMS: Record<Lang, TermsDoc> = { hu: HU, en: EN, de: DE };

export default function TermsScreen({ lang, onBack }: { lang: Lang; onBack: () => void }) {
  const d = TERMS[lang] ?? HU;
  return (
    <View testID="terms">
      <PageHeader title={d.title} onBack={onBack} />
      <Text style={{ color: C.warn, fontSize: 13, marginBottom: 14 }}>{d.draft}</Text>
      <View style={{ backgroundColor: C.card, borderRadius: 18, borderWidth: isDark ? 0 : 1, borderColor: C.line, padding: 16, gap: 16 }}>
        {d.blocks.map(([title, body]) => (
          <View key={title} style={{ gap: 4 }}>
            <Text role="heading" aria-level={2} style={{ fontWeight: '800', fontSize: 16, color: C.text }}>{title}</Text>
            <Text style={{ color: C.text, fontSize: 14, lineHeight: 21 }}>{body}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}
