# Parkolj – budapesti parkolóapp prototípus

Expo (React Native + TypeScript) app, ami iOS-en, Androidon és weben is fut.

## Mit tud (prototípus, demó adatokkal)
1. Célpont keresés (színház, mozi, látványosság) – demó lista
2. Zóna felismerés (A–D), díj és időkorlát kijelzése
3. 3 javaslat: leggyorsabb utcai hely, olcsóbb utcai hely, legközelebbi garázs
4. Navigáció átadás: Google Maps / Apple Maps / Waze
5. Parkolás indítása: rendszám, időtartam, demó fizetés (nincs valódi terhelés), SMS tartalék
6. Aktív parkolás: visszaszámláló, percalapú díj, +15 perc, leállítás
7. Lejárati figyelmeztetés (10 perccel előtte és lejáratkor), 3 órás szabály az A–C zónában
8. Magyar / angol felület

## Futtatás
```bash
npm install
npx expo start        # QR kód -> Expo Go app a telefonon
npx expo start --web  # böngészőben
```

## Fontos
- `src/data/zones.ts`: zónahatárok **közelítők**, élesben a fővárosi/NMFR adatból jönnek.
- `src/logic/recommend.ts`: a foglaltság **szimulált** (determinisztikus modell).
- `src/data/garages.ts`: kitalált garázsárak és kapacitás.
- Fizetés: csak demó, az NMFR viszonteladói szerződésig nincs valódi fizetés.
