# Így kerül a Parkolj a telefonodra

Három út van. Az első 1 perc, de widget nélkül. A második Androidra a legegyszerűbb igazi app, widgetekkel. A harmadik az iPhone, ahhoz fizetős Apple fejlesztői fiók kell.

| | Mennyi idő | Mi kell hozzá | Widget |
| --- | --- | --- | --- |
| A. Webapp a kezdőképernyőn | 1 perc | semmi | nincs |
| B. Android app (APK) | ~30 perc, ebből ~15–20 perc a gépi fordítás | ingyenes Expo fiók | van |
| C. iPhone app | 1–3 nap (az Apple jóváhagyása miatt) | Apple Developer Program, 99 USD/év, és egy gép Node.js-sel | van, zárolt képernyőn is |

## A. Webapp a kezdőképernyőn (azonnal, telepítés nélkül)

1. Nyisd meg a telefonon: https://botondk.github.io/parkolj/
2. iPhone (Safari): Megosztás gomb → „Főképernyőhöz adás”.
   Android (Chrome): ⋮ menü → „Alkalmazás telepítése” vagy „Hozzáadás a kezdőképernyőhöz”.
3. Ikonnal, teljes képernyőn indul. Korlátok: widget nincs, és a lejárati értesítés csak nyitott appnál szól.

## B. Android: telepíthető app widgetekkel (gép sem kell, a GitHubról indítod)

Egyszeri beállítás, kb. 10 perc:

1. Regisztrálj ingyen: https://expo.dev/signup
2. expo.dev → jobb fent a profilod → **Account settings → Access tokens → Create token**. Nevezd el pl. „github”-nak, és másold ki a tokent.
3. GitHubon a repóban: **Settings → Secrets and variables → Actions → New repository secret**. Név: `EXPO_TOKEN`, érték: a kimásolt token.

Utána minden új verziónál:

4. GitHub → **Actions** → bal oldalt **„Telefonos build (EAS)”** → **Run workflow** → platform: `android` → **Run workflow**.
5. 1–2 perc múlva a futás zöld lesz. Ekkor a build már az Expo felhőjében fut, ez kb. 15–20 perc (ingyenes fiókkal néha sorban kell állni). A kész buildről az Expo e-mailt is küld.
6. A telefonon nyisd meg az expo.dev-et, majd a **Projects → parkolj-budapest → Builds** oldalon a legfrissebb Android buildet, és koppints az **Install** gombra. Gépről is mehet: az Install gomb QR-kódot mutat, ezt olvasd be a telefonnal.
7. Az első telepítésnél az Android rákérdez, hogy engedélyezed-e az ismeretlen forrásból való telepítést a böngészőnek. Engedélyezd, és telepítsd.
8. Widget: tartsd lenyomva a kezdőképernyőt → **Widgetek** → keresd a **Parkolj**-t → húzd ki a „Parkolásom” vagy a „Gyors indítás” widgetet.

Ha a 4. lépés piros: a leggyakoribb ok, hogy hiányzik vagy elírt az `EXPO_TOKEN`. A hibaüzenet a futás „Expo projekt összekötése” lépésében látszik.

Gépről is ugyanez: `npx eas-cli@latest login`, majd `npx eas-cli@latest build -p android --profile preview`.

## C. iPhone: saját telefonra (ad hoc)

Az Apple csak fizetős fejlesztői fiókkal enged appot telepíteni App Store nélkül. Az első alkalomhoz egy gép kell (Windows, Mac vagy Linux, Node.js 20+), mert az Apple-belépés és a tanúsítványok beállítása kérdez.

1. Lépj be az **Apple Developer Programba**: https://developer.apple.com/programs/ (99 USD/év). A jóváhagyás akár 1–2 nap.
2. Keresd ki a **Team ID**-t: developer.apple.com → Account → Membership details. Írd be az `app.json`-ba (`"ios": { "appleTeamId": "XXXXXXXXXX", … }`), vagy küldd el, és beírom.
3. A gépen, a repó mappájában:
   ```bash
   npm install
   npx eas-cli@latest login
   npx eas-cli@latest device:create
   ```
   Ez linket és QR-kódot ad. Nyisd meg az iPhone-on **Safariban**, telepítsd a felkínált profilt (Beállítások → „Profil letöltve” → Telepítés). Így kerül fel a telefonod a listára. Friss Apple-fióknál az Apple 24–72 óráig is elfogadhatja.
4. Build indítása:
   ```bash
   npx eas-cli@latest build -p ios --profile preview
   ```
   Kérdezni fog: lépj be az Apple ID-ddal, és hagyd, hogy az EAS készítse el a tanúsítványokat és az App Groupot (minden kérdésre igen). A widget miatt két azonosítót kér: `hu.parkolj.app` és `hu.parkolj.app.widget`.
5. Ha kész (~20 perc), az iPhone-on nyisd meg a build linkjét (expo.dev → Builds → **Install**), és telepítsd.
6. iOS 16-tól be kell kapcsolni a **Fejlesztői módot**: Beállítások → Adatvédelem és biztonság → Fejlesztői mód → be. A telefon újraindul, utána erősítsd meg a Bekapcsolás gombbal és a jelkóddal. Ha a menüpont nem látszik, előbb koppints egyszer a telepített app ikonjára, és megjelenik.
7. Widget: tartsd lenyomva a kezdőképernyőt → **Szerkesztés → Widget hozzáadása** → Parkolj. A zárolt képernyőre: tartsd lenyomva a zárolt képernyőt → **Testreszabás → Widgetek hozzáadása**.

Az első iPhone-build után a GitHubos gomb (B. út, `ios` platform) is működik, mert a tanúsítványokat az Expo megjegyzi. Új telefont viszont csak a 3. lépéssel lehet felvenni, és utána új build kell.

**TestFlight** (több tesztelőnek, pl. a zárt bétához): ugyanaz az Apple fiók kell hozzá. Gépről indítva: `npx eas-cli@latest build -p ios --profile production --auto-submit`. A tesztelők a TestFlight appból telepítik, és nem kell egyenként felvenni a telefonjukat. Ezt a bétánál állítjuk be.

## Jó tudni

- Az **Expo Go** appban a widgetek és néhány natív funkció nem működik, ezért kell a saját build.
- Az ingyenes Expo fiókkal havonta korlátozott számú build indítható, és ezek lassabb sorban futnak. Egy próbához bőven elég.
- A buildbe csak a nyilvános beállítások kerülnek: a Supabase címe és a publikus kulcsa. A titkos kulcsok soha.
