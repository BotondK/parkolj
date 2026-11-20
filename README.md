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
9. „Parkolás itt”: koppintás a térképre vagy saját helyzet (telefonon), azonnali indítás
10. Mentett autók, külföldi rendszám országkóddal
11. Előzmények havi összesítővel és nyugtával (helyben tárolva)
12. Tudnivalók: zónák, díjak, 3 órás szabály, turistáknak (HU/EN)

13. Csak a díjfizetési időre fizetsz: ha közben díjmentes lesz (pl. 20:00), a díj addig számol, és a parkolás magától leáll
14. „Mikor érkezel?” választó: a becslés az érkezési időre számol
15. Első indításkor nyelvválasztás (a készülék nyelve alapján előválasztva) és rövid bemutató
16. Hivatalos BKK szabályok: díjfizetés csak munkanapon (A 8–22, B 8–20, C 8–18, D 8–18), ünnepnapok, pótdíjak, a 68 valódi 4 jegyű zónakód az SMS-es fizetéshez
17. Valódi címkeresés (Photon / OpenStreetMap), a helyi lista tartalékként

## Futtatás
```bash
npm install
npx expo start        # QR kód -> Expo Go app a telefonon
npx expo start --web  # böngészőben
npm test              # díj-, zóna- és ajánló logika tesztjei
```

## Fontos
- `src/data/zones.ts`: díjak, díjfizetési idők, pótdíjak a BKK listái szerint (https://bkk.hu/downloads/43733/, https://bkk.hu/downloads/43739/). A zónahatárok (polygon) még **közelítők**, hivatalos határfájlt (GeoJSON/KML) nem találtunk nyilvánosan.
- `src/data/zoneCodes.ts`: zónakódok kerülettel, ünnepnapok 2026–2027 (áthelyezett munkanapok még nincsenek benne).
- `src/logic/geocode.ts`: Photon geokódoló; élesben saját vagy fizetős szolgáltatás kell.
- `src/logic/recommend.ts`: a foglaltság **szimulált** (determinisztikus modell).
- `src/data/garages.ts`: kitalált garázsárak és kapacitás.
- Fizetés: csak demó, az NMFR viszonteladói szerződésig nincs valódi fizetés.
