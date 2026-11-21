import { Text, View } from 'react-native';
import { PageHeader } from '../components/kit';
import { C, isDark } from '../components/ui';
import type { Lang } from '../i18n';

// Adatkezelési tájékoztató a zárt bétához. TERVEZET: indulás előtt jogásznak át kell néznie,
// és a [ ] helyekre a cég adatai kerülnek (a Kft. megalakulása után).
type Block = [title: string, body: string];

const HU: { title: string; draft: string; blocks: Block[] } = {
  title: 'Adatkezelési tájékoztató',
  draft: 'Tervezet a zárt bétához, jogi átnézés előtt. Utolsó módosítás: 2026. november 21.',
  blocks: [
    ['Ki kezeli az adataidat?', 'A Parkolj üzemeltetője: [cégnév, székhely, cégjegyzékszám]. Kapcsolat: [e-mail cím]. Adatvédelmi kérdésben is itt érsz el minket.'],
    [
      'Milyen adatokat tárolunk?',
      'Fiók nélkül minden adat csak a készülékeden marad. Ha belépsz, ezek kerülnek a fiókodba: e-mail cím, név, autók (rendszám, országkód), kedvenc helyek, parkolási előzmények (hely, zóna, idő, díj), az aktív parkolás, beállítások, számlázási profilok (név, cím, céges adószám). Bankkártyából csak a márkát, az utolsó 4 számjegyet és a lejáratot tároljuk, a teljes számot és a CVC-t soha.',
    ],
    ['Helyadatok', 'A GPS-helyzetedet csak a készüléken használjuk (térkép, „Parkolás itt”, vissza az autóhoz). A szerverre csak az a hely kerül, ahol parkolást indítasz.'],
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
  draft: 'Draft for the closed beta, before legal review. Last updated: 21 November 2026.',
  blocks: [
    ['Who handles your data?', 'Parkolj is operated by [company name, registered office, company number]. Contact: [email address], also for privacy questions.'],
    [
      'What we store',
      'Without an account everything stays on your device. When you sign in, your account holds: email, name, cars (plate, country code), favourite places, parking history (place, zone, time, fee), the active parking, settings and billing profiles (name, address, company tax number). For bank cards we only keep the brand, the last 4 digits and the expiry date, never the full number or the CVC.',
    ],
    ['Location', 'Your GPS position is used on your device only (map, “Park here”, back to my car). Only the place where you start a parking is sent to the server.'],
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

export default function PrivacyScreen({ lang, onBack }: { lang: Lang; onBack: () => void }) {
  const d = lang === 'en' ? EN : HU;
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
