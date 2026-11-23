# Telefonos app kipróbálása és buildelése

## 1. Leggyorsabb: webapp a kezdőképernyőn (nem kell semmi telepíteni)
Nyisd meg a https://botondk.github.io/parkolj/ címet a telefonon.
- **iPhone (Safari):** Megosztás gomb → „Főképernyőhöz adás”.
- **Android (Chrome):** ⋮ menü → „Alkalmazás telepítése” vagy „Hozzáadás a kezdőképernyőhöz”.
Ikonnal, teljes képernyőn indul. Korlát: a lejárati értesítés csak nyitott appnál szól.

> Widgetek (docs/WIDGETEK.md): Expo Go-ban nem futnak, development/preview build kell; iPhone-hoz az app.json-ba kell az `ios.appleTeamId`.

## 2. Expo Go (natív térkép, háttérértesítés nélkül teljes értékű teszt)
```bash
npm install
npx expo start
```
A telefonon telepítsd az **Expo Go** appot, és olvasd be a QR-kódot (ugyanazon a wifin).

## 3. Saját telepíthető build (EAS, felhőben, Mac nélkül is)
Kell hozzá egy ingyenes Expo fiók (https://expo.dev).
```bash
npx eas-cli@latest login
npx eas-cli@latest init                       # összeköti a projektet a fiókkal
npx eas-cli@latest build -p android --profile preview   # telepíthető APK, linket kapsz
npx eas-cli@latest build -p ios --profile preview       # iPhone-ra: Apple Developer fiók kell (99 USD/év)
```
Az app azonosítója: `hu.parkolj.app` (app.json). Bolti kiadás előtt érdemes véglegesíteni a nevet és az azonosítót.
