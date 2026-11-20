# Terven felüli kérések és bővítések

A projektterv prototípus-mérföldköve (2026. december 20.) ezt tartalmazza: célpont keresés, zóna felismerés,
3 parkolási opció, navigáció átadás, SMS tartalék, visszaszámláló és lejárati figyelmeztetés. Valódi fizetés
csak az NMFR viszonteladói szerződés után (2027 tavasz).

Ebben a fájlban vezetjük, mi került a projektbe ezen felül, és ki kérte. Új tételt mindig a táblázat végére írunk.

## Boti kérései (terven felül)

| Dátum | Kérés | Állapot | Megjegyzés |
|---|---|---|---|
| 2026-11-20 | A demóban a „Saját helyzetem” ne legyen, ahol nem működik | Kész | A beágyazott demó linken rejtve, máshol látszik |
| 2026-11-20 | A kereső ne csak a demó adatbázisban keressen | Kész | Photon (OpenStreetMap) címkeresés + kerületek; beágyazott linken a biztonsági korlát miatt nem megy |
| 2026-11-20 | A térkép legyen valódi | Kész | Valódi kerülethatárok; a teljes utcatérkép a GitHub Pages demón |
| 2026-11-20 | Publikus webes demó saját címen | Kész | https://botondk.github.io/parkolj/, automatikus kiadás minden `main` feltöltés után |
| 2026-11-20 | „Normális” (Google Maps-szerű) térkép | Kész | Részletes színes alaptérkép, nagyító és helymeghatározó gomb |
| 2026-11-20 | GPS, ha engedélyezem | Kész | Élő kék pont pontossági körrel, engedély után magától indul, „Parkolás itt” a GPS-helyzetből |

## Saját javaslatra beépítve (a tervben nem szerepelt külön)

| Dátum | Bővítés | Miért |
|---|---|---|
| 2026-11-20 | „Parkolás itt” mód (térképre koppintás) | Aki már ott áll, ne kelljen célpontot keresnie |
| 2026-11-20 | Mentett autók, külföldi rendszám | Turisták a fő célcsoport |
| 2026-11-20 | Előzmények, havi összesítő, nyugta | Elszámolás, bizalom |
| 2026-11-20 | Tudnivalók fül (zónák, 3 órás szabály, pótdíjak) | Turisták és új felhasználók |
| 2026-11-20 | Csak a díjfizetési időre fizetsz, automatikus leállítás | Felhasználói megtakarítás, erős érv a Simple-lel szemben |
| 2026-11-20 | „Mikor érkezel?” választó | Színházi, mozis kezdéshez |
| 2026-11-20 | Első indításkori bemutató, nyelv a telefon nyelvéből | Turisták |
| 2026-11-20 | Hivatalos BKK díjfizetési idők, ünnepnapok, pótdíjak, 68 zónakód | A demó adatok helyett valódi szabályok |
| 2026-11-20 | Automatikus tesztek és GitHub Actions | Minőség, biztonságos kiadás |
| 2026-11-20 | Ütemezett lejárati értesítés telefonon (bezárt appnál is) | A terv „lejárati figyelmeztetés” pontjának teljes megvalósítása |
| 2026-11-20 | Telepíthető webapp (ikon, teljes képernyő) | Telefonon kipróbálható boltok nélkül |
| 2026-11-20 | „Vissza az autómhoz” gyalogos navigáció | Idegen helyen parkoló turistáknak |
| 2026-11-20 | Saját app ikon, EAS build beállítás, telefonos útmutató | Felkészülés a telepíthető buildre |
| 2026-11-20 | Szerver (API) váz már a prototípus idején | Az alfa (2027 jan–feb) előkészítése, a BKK-adatmegosztás bemutatható alapja |
| 2026-11-20 | Ingyenes szerver + adatbázis előkészítése, opcionális app–szerver szinkron. Boti döntése alapján: Supabase (PostgreSQL) + Cloudflare Workers, időzített lezárással | Az alfa előkészítése; Boti kérésére: „csak regisztrálni kelljen” |
| 2026-11-20 | Díjszámítás budapesti idő szerint, a készülék/szerver időzónájától függetlenül | A Workers UTC-ben fut, a külföldi turista telefonja más zónában lehet: enélkül rossz órára számolna |
| 2026-11-20 | Design a BudapestGO mintájára: bal oldali panel + teljes térkép asztalon, alsó lap telefonon, lila fő szín, kerek térképgombok, óra és menü jobbra fent | Boti kérése („ilyen legyen a design 1/1”); saját név és logó, BKK-arculat nélkül |
