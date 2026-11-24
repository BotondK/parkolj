# Parkolj – budapesti parkolóapp prototípus

Expo (React Native + TypeScript) app, ami iOS-en, Androidon és weben is fut.

**Webes demó:** https://botondk.github.io/parkolj/ (minden `main` push után automatikusan frissül, lásd `.github/workflows/pages.yml`).

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
18. Valódi kerülethatárok a térképen (OSM, ODbL); az A zóna az V. kerület valódi határa, a B zóna a pesti kerülethatárokra vágva; kerületkeresés
19. Részletes, színes alaptérkép nagyító és helymeghatározó gombokkal
20. Élő GPS: kék pont pontossági körrel, engedély után magától indul, „Parkolás itt” a GPS-helyzetből
21. Telefonon ütemezett lejárati értesítés, bezárt appnál is
22. Telepíthető webapp (Hozzáadás a kezdőképernyőhöz), saját ikon
23. „Vissza az autómhoz” gyalogos navigáció
24. BudapestGO-szerű felület: alsó fülsor (Parkolás, Kedvenceim, Parkolásaim, Menü), kereső a térkép tetején, világos és sötét mód
25. Valódi mélygarázsok (OSM) és elektromos töltők a térképen ikonokkal, rétegválasztó; pontos zónahatárok a BKK zónatérképből és utcaszinten
26. Kedvenceim: Otthon, Munkahely, mentett helyek, autók alapértelmezettel
27. Parkolásaim: aktív parkolás „jegy” kártyaként, lezárt parkolások nyugtával
28. Menü: fiók, értesítésnapló, beállítások (emlékeztető 5/10/15 perc), mentett bankkártyák (csak utolsó 4 számjegy), magán/céges számlázási profil, biometrikus jóváhagyás, kupon
29. Fiók és szinkron minden eszközre: e-mailes belépés kóddal (Supabase; beállítás: [docs/FIOK.md](docs/FIOK.md))
30. Visszajelzés küldése az appból (zárt bétához), kapcsolat nélkül sorba kerül
31. Aktív parkolás szinkronja eszközök között
32. Parkolj Plusz (590 Ft/hó vagy 39 Ft/parkolás, demó fizetés): automatikus hosszabbítás a 3 órás szabályon belül, havi kimutatás profilonként CSV-exporttal, „hol hagytam az autót” jegyzet
33. A garázsjavaslat valódi helyekből (OSM, nyilvános, névvel), becsült óradíjjal, férőhellyel, nyitvatartással; Parkl-foglalás link a Parkl üzemeltetésű garázsoknál
34. Adatkezelési tájékoztató (tervezet a zárt bétához, jogi átnézés előtt) a Menüben és a belépésnél
35. Akadálymentesség (WCAG 2.1 AA): képernyőolvasó-nevek és szerepek, AA kontraszt világos és sötét módban; automatikus axe-vizsgálat minden feltöltésnél (`e2e/a11y.spec.ts`)
36. „Városnak” oldal (https://botondk.github.io/parkolj/?varos): anonim összesítés zóna × nap × óra szerint (csoportonként legalább 5 parkolás és 3 felhasználó), hőtérkép, zónánkénti összesítő, CSV; amíg kevés a béta-adat, jelölt mintaadat
37. Internet nélkül is működik (service worker): egyszeri betöltés után az app, a zónák és a már látott térkép offline is betölt, az aktív jegy és az autó helye látszik, „Nincs internet” jelzés. Build: `npm run build:web`
38. Német nyelv (Deutsch) a magyar és angol mellé, a készülék nyelve alapján előválasztva; német adatkezelési tájékoztató
39. „Előadás végéig”: színház, koncert, mozi, meccs célpontnál a parkolási idő az esemény várható végéhez igazodik (kezdés a következő félórára, jellemző hossz, visszaséta); ha a 3 órás szabály miatt nem fér bele, a javaslat jelzi, és ott a garázs
40. Névtelen használati statisztika a zárt bétához (keresés → navigáció → indítás → leállítás tölcsér), felhasználói azonosító, rendszám és pontos hely nélkül; kikapcsolható; napi összesítő: `select * from public.funnel_daily;` a Supabase SQL Editorban
41. Béta jelentkezési oldal (https://botondk.github.io/parkolj/?beta), magyarul, angolul és németül: e-mail, telefon típusa, parkolási szokás, hozzájárulás; a lista csak a Supabase-ben olvasható
42. Kezdőképernyő-widgetek iPhone-ra és Androidra: „Parkolásom” (zóna, élő visszaszámlálás, +15 perc, leállítás; iPhone zárolt képernyőn is) és „Gyors indítás” (itt, otthon, munkahely); előnézet a webes demóban: Menü → Widgetek. Részletek: `docs/WIDGETEK.md`
43. Élő tevékenység iPhone-on: parkolás közben a zárolt képernyőn és a Dynamic Islandben is fut a visszaszámlálás, +15 perc és Leállítás gombbal
44. Ledolgozós szombat és áthelyezett pihenőnap: ledolgozós szombaton munkanapi rend szerint számol díjat (pótdíjveszély, főleg turistáknak), az áthelyezett pihenőnap díjmentes; pár nappal előtte figyelmeztet a fizetésnél és a Tudnivalókban
45. A javaslatok valódi zónás utcákon (OSM utcaszintű adatból), utcanévvel; minden javaslaton „kb. X perc a célig” (helykeresés + gyaloglás), a valóban leggyorsabb jelölve
46. „Nem volt hely” gomb (a következő javaslatra lép) és „Hibás zóna vagy ár?” jelzés, névtelenül (`spot_reports` tábla)
47. P+R javaslat belvárosi célnál (ingyenes parkolás a szélen, onnan tömegközlekedéssel), P+R réteg a térképen (OSM-adat)
48. Gyakori helyeid: a keresőben az előre megadott népszerű célpontok helyett a gyakran választott helyek (csak a készüléken)
49. Belépés e-mail címmel és jelszóval, elfelejtett jelszó visszaállítása (Supabase)
50. Lakossági parkolási engedély: tudnivaló és link a kerületi igényléshez
51. „Hol hagytam az autót?” mindenkinek: szint, jegyzet és fotó az aktív jegyen (a fotó csak a készüléken marad)

Tesztek: `npm test` (logika), `npm run e2e` (végigkattintós, a webes buildre), `cd server && npm test` (API). A webes demó csak akkor frissül, ha mind átmegy.

Szerver (API, alfa váz): [docs/API.md](docs/API.md)

Telefonos kipróbálás és build: [docs/TELEFONOS_BUILD.md](docs/TELEFONOS_BUILD.md)

A terven felüli kérések naplója: [docs/TERVEN_FELUL.md](docs/TERVEN_FELUL.md)

## Futtatás
```bash
npm install
npx expo start        # QR kód -> Expo Go app a telefonon
npx expo start --web  # böngészőben
npm test              # díj-, zóna- és ajánló logika tesztjei
```

Szerverszinkron (opcionális): `EXPO_PUBLIC_API_URL=https://... npx expo start`. Szerver és adatbázis ingyenesen: [docs/HOSZTOLAS.md](docs/HOSZTOLAS.md).

## Fontos
- Térkép: MapLibre GL + OpenFreeMap (ingyenes, kulcs nélkül). Garázsok, töltők, utcaszintű zónák: OpenStreetMap (ODbL), frissítés: Actions → „OSM adatok letöltése”, majd `git checkout origin/osm-data -- src/data/osm public/data`.
- `src/data/zones.ts`: díjak, díjfizetési idők, pótdíjak a BKK listái szerint (https://bkk.hu/downloads/43733/, https://bkk.hu/downloads/43739/). Zónahatárok: `src/data/zoneShapes.ts`, a BKK „Parkolási zónák 2026.07.01-étől” vektoros PDF-térképéből kinyerve és a kerülethatárokhoz illesztve (`scripts/zones_from_bkk_pdf.py`); a térkép tájékoztató jellegű.
- `src/data/zoneCodes.ts`: zónakódok kerülettel, ünnepnapok 2026–2027, munkanap-áthelyezések (2026: 10/2025. NGM rendelet; a 2027-es rendelet 2026 novemberében még nem jelent meg, megjelenésekor fel kell venni).
- `src/logic/geocode.ts`: Photon geokódoló; élesben saját vagy fizetős szolgáltatás kell.
- `src/logic/recommend.ts`: a foglaltság **szimulált** (determinisztikus modell).
- `src/data/garages.ts`: kitalált garázsárak és kapacitás.
- Fizetés: csak demó, az NMFR viszonteladói szerződésig nincs valódi fizetés.
