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
| 2026-11-20 | Vektoros térkép (MapLibre + OpenFreeMap), rétegválasztó; valódi mélygarázsok/parkolóházak (77) és elektromos töltők (538) az OSM-ből; utcaszintű zónák díjidővel (2074 utcaszakasz), a zóna meghatározása ezekkel | Boti kérése: pontos zónahatárok, töltők, mélygarázsok a térképen |
| 2026-11-20 | Oldalpanel: logó felül, alatta kereső; a „Parkolás” cím kikerült (a ✕ is, a lépésekben van „Vissza”) | Boti kérése |
| 2026-11-20 | Hivatalos zónahatárok a BKK „Parkolási zónák 2026.07.01-étől” PDF-térképből (Boti találta): kinyerve, kerülethatárokra illesztve (~20 m), OSM-mel 94,8%-ban egyezik; zónaszínek a BKK térkép szerint | A becsült zónák helyett; a térkép tájékoztató jellegű |
| 2026-11-21 | BudapestGO-szerű alsó fülsor (Parkolás, Kedvenceim, Parkolásaim, Menü), kereső „pirula” a térkép tetején otthon/munkahely gombbal, saját vonalas ikonok | Boti kérése (képernyőképek alapján): „designban legyen ilyen” |
| 2026-11-21 | Sötét és világos mód (Rendszer/Világos/Sötét), sötét alaptérkép | Boti kérése: sötét és világos képernyőképek |
| 2026-11-21 | Kedvenceim: Otthon, Munkahely, mentett helyek (csillag a célpontnál), autók kezelése alapértelmezettel | BudapestGO funkciók átvétele |
| 2026-11-21 | Parkolásaim: aktív parkolás „jegy” kártyaként (Érvényes/Lejárt, +15 perc), lezártak nyugtával, súgósáv | BudapestGO funkciók átvétele |
| 2026-11-21 | Menü: profil (helyi fiók), Értesítéseim (napló), Beállítások (emlékeztető 5/10/15 perc, súgósáv, nyelv, téma), Vásárlás és fizetés: mentett bankkártyák (csak márka + utolsó 4 számjegy), magán/céges számlázási profil adószámmal, biometrikus jóváhagyás összeghatár felett, kuponbeváltás jóváírással; fizetésnél kártya és profil választás | Boti kérése: „fizetési opciók mentése, stb” |
| 2026-11-21 | Parkolás fül ikonja „P” tábla; térképikonok: mélygarázs = lila „P” négyzet, töltő = zöld villám (gyorstöltő sárga kerettel); beállítások választógombjai levegősebbek, világos módban is látható háttérrel | Boti kérése |
| 2026-11-21 | Telefonos (natív) térkép: mélygarázsok és töltők ugyanazokkal a jelekkel (közelítéskor, a látható részen), rétegválasztó, sötét mód | Boti „folytasd” + ikonkérés; a web és a telefon egyezzen |
| 2026-11-21 | Fiók és szinkron előkészítve: e-mailes belépés 6 jegyű kóddal (Supabase Auth, jelszó nélkül), adatok szinkronja minden eszközre, adatbázis-séma sorszintű jogosultsággal, kártyaszám-védelemmel és fióktörléssel (supabase/schema.sql, docs/FIOK.md). Kulcsok nélkül a helyi fiók marad | Boti „folytasd”; a terv szerinti Supabase-re épül, a kulcsok megadása után azonnal működik |
| 2026-11-21 | Végigkattintós automata tesztek (Playwright, mobil + asztali), a webes demó csak akkor frissül, ha átmennek | Boti „folytasd”: alfa/béta előtti minőségbiztosítás |
| 2026-11-21 | Visszajelzés küldése az appból (csillagos értékelés + szöveg), Supabase-táblába; kapcsolat nélkül sorba kerül | Boti „folytasd”: a zárt bétához kell |
| 2026-11-21 | Kedvencek (Otthon, Munkahely, mentett helyek) a Parkolás panel tetején; asztalon a jobb felső menügomb kikerült, csak az óra maradt | Boti kérése |
| 2026-11-21 | Belépés e-mailes linkkel is (a Supabase ingyenes csomagjában a levélsablon nem szerkeszthető, így kód nincs a levélben); a kód is megmaradt saját SMTP-hez | Boti jelezte, hogy a sablon nem szerkeszthető |
| 2026-11-21 | Supabase-beállítás hibatűrése: a URL https:// nélkül vagy projektazonosítóként is jó, az új (sb_publishable_) kulcs is működik, a belépési hiba pontos okát kiírja | Boti élesítésekor kiderült hiba |
| 2026-11-21 | Aktív parkolás szinkronja eszközök között (telefonon indítod, gépen látod/leállítod), frissítés visszaváltáskor | Boti „folytasd” a működő belépés után |
| 2026-11-21 | Parkolj Plusz prémium csomag: 590 Ft/hó előfizetés vagy 39 Ft alkalmi díj (demó fizetés); automatikus hosszabbítás lejárat előtt 2 perccel 15 percenként, beállítható kerettel és a zóna maximumán belül; havi kimutatás számlázási profilonként CSV-exporttal; „hol hagytam az autót” jegyzet a jegyen és a nyugtán | Boti: „mehetünk a profi funkciókkal is” |
| 2026-11-22 | Akadálymentességi vizsgálat (WCAG 2.1 AA, axe) a fő képernyőkön és a hibák javítása: gomb- és fülszerepek, feliratok a kapcsolókon és mezőkön, kontraszt (zónaszínek, figyelmeztető és sikerszín); a vizsgálat a CI része | Boti „folytasd”: az EU akadálymentességi irányelve (2025. jún. óta) a fizetős fogyasztói appokra is vonatkozhat |
| 2026-11-22 | „Városnak” oldal a BKK-s bemutatóhoz (?varos): anonim összesítés a béta parkolásaiból (Supabase city_stats függvény, ≥5 parkolás és ≥3 felhasználó csoportonként), hőtérkép zóna × óra, zónánkénti összesítő, CSV; addig jelölt mintaadat | Boti „folytasd”: a terv szerinti BKK-kapcsolatfelvételhez (2027. feb.) |
| 2026-11-22 | Offline működés a webappban (service worker: app, zónaadatok, már látott térképcsempék), „Nincs internet” jelzés, offline végigkattintós teszt | Boti „folytasd”: mélygarázsban nincs térerő, a jegynek és az autó helyének akkor is látszania kell |
| 2026-11-22 | Német nyelv (teljes felület, adatkezelési tájékoztató, időformátumok), automatikus választás német nyelvű készüléken | Boti „folytasd”: a turisták fő célcsoport, Ausztriából és Németországból sokan érkeznek autóval |
| 2026-11-22 | Turistabarát finomítás: a térkép feliratai, felugró ablakai és gombnevei angolul és németül; „Zone A” sorrend; német helynevek és keresés német névre | Boti „folytasd” |
| 2026-11-22 | „Előadás végéig” parkolási idő színház, koncert, mozi és meccs célpontnál (HU/EN/DE), automatikusan előválasztva | Boti „folytasd”: a fő célpontok (színház, mozi) köré épülő érték |
| 2026-11-22 | Névtelen használati statisztika a zárt bétához (events tábla, napi tölcsér nézet), kikapcsolható, a tájékoztatóban 3 nyelven; mellékesen javítva: a Beállítások kapcsolóit a képernyőolvasó letiltottnak jelezte | Boti „folytasd”: a bétából mérhető, hol akadnak el a felhasználók |
| 2026-11-23 | Béta jelentkezési oldal (?beta) HU/EN/DE: e-mail, telefon, parkolási szokás, hozzájárulás; Supabase beta_signups tábla, csak függvényen át írható, kívülről nem olvasható; tájékoztató kiegészítve | Boti „folytasd”: a zárt béta (2027 tavasz, 50–100 fő) toborzása már most elindulhat, a BKK-s bemutatón is megmutatható az érdeklődők száma |
| 2026-11-23 | Kezdőképernyő-widgetek: „Parkolásom” (zóna, rendszám, élő visszaszámlálás iPhone-on, lejárat ideje Androidon, +15 perc, leállítás; iPhone zárolt képernyőn is) és „Gyors indítás” (Parkolás itt, Otthon, Munkahely); natív Android (react-native-android-widget) és iOS (WidgetKit) megvalósítás, mélylinkek, webes előnézet a Menüben | Boti kérése: „widgeteket is tervezz … a mobilappoknál fontos lehet” |
| 2026-11-23 | Telepítési útmutató a saját telefonra (docs/TELEFONRA.md: webapp, Android APK, iPhone ad hoc, TestFlight) és egy kattintásos Android build a GitHubról (Actions → „Telefonos build (EAS)”) | Boti kérése: „írd meg, hogy tudom rátenni a telómra” |
| 2026-11-24 | Élő tevékenység iPhone-on (zárolt képernyő + Dynamic Island): visszaszámlálás, +15 perc, leállítás; helyi natív modul, előnézet a Menü → Widgetek oldalon | Boti „folytasd” a widgetek után: parkolás közben ez a leggyorsabb rálátás, telefonfeloldás nélkül |
| 2026-11-24 | Ledolgozós szombat és áthelyezett pihenőnap kezelése: ledolgozós szombaton munkanapi díjfizetés, áthelyezett pihenőnapon díjmentes; figyelmeztetés a fizetésnél és a Tudnivalókban (HU/EN/DE) | Boti „folytasd”: eddig a ledolgozós szombatot ingyenesnek mutatta, ami pótdíjhoz vezethet (2026. aug. 8-án sokan, köztük külföldiek, pótdíjat kaptak) |
| 2026-11-24 | „Nem volt hely” és „Hibás zóna vagy ár” jelzés névtelenül (spot_reports), P+R javaslat és réteg, lakói engedély tudnivaló | Boti „folytasd a következő lépésekkel”: a terv MVP-listájának hiányzó pontjai |
| 2026-11-24 | Javaslatok csak valódi zónás utcán, utcanévvel; „kb. X perc a célig” minden javaslaton, a leggyorsabb jelölve; az utcai javaslatok új neve („Utcán, közel”, „Utcán, olcsóbb”) | Boti jelezte: az „Olcsóbb” a Nyugati pályaudvar területére került 0 Ft-tal, és a garázs gyorsabb volt a „Leggyorsabb”-nál |
| 2026-11-24 | Népszerű célpontok helyett „Gyakori helyeid” | Boti kérése: töröljem az előre megadott helyeket, a gyakran választottakat mentse |
| 2026-11-24 | Belépés e-mail címmel és jelszóval (regisztráció, elfelejtett jelszó, jelszócsere) a jelszó nélküli belépő link helyett | Boti kérése: „inkább felhasználónév, jelszó” |
| 2026-11-24 | iPhone-ra mentett webapp: a térkép nem rajzol a panel és a fülsor fölé | Boti képernyőképe alapján |
| 2026-11-24 | Elektromos töltők élő adata (ár, foglaltság): utánanézés | Boti kérése; ingyenes, élő magyar forrást nem találtam, ezért nincs bekötve |
| 2026-11-24 | „Hol hagytam az autót?” mindenkinek: szint, jegyzet, fotó (a fotó csak a készüléken), a jegyen és a nyugtán; a Pluszból kikerült (kapcsoló: CAR_SPOT_FREE) | Boti „folytasd”: a terv szerint ez az MVP része („Hol parkoltam + fotó + emelet”) |
| 2026-11-24 | „Nem volt hely” jelzések hasznosítása: névtelen forró pontok (≥3 jelzés ≥2 napról, ~100 m × 3 óra), a javaslat ott kisebb esélyt mutat és jelzi; „Városnak” oldalon „Hol nem találnak helyet?” lista | Boti „folytasd”: a terv szerint a BKK-nak ingyenes „hol nem volt hely” adatot adunk, és ez a javaslatokat is okosabbá teszi |
| 2026-11-24 | Összeomlás-védelem: hibaképernyő a futó jeggyel és újraindítás gombbal; névtelen hibajelentés (`app_errors` tábla, `error_summary` nézet), a statisztika kapcsolója erre is vonatkozik; tesztoldal: ?crashtest | Boti „folytasd”: a zárt béta előtt tudnunk kell, ha a tesztelőknél összeomlik az app, és a jegynek ilyenkor is látszania kell |
| 2026-11-25 | Húzható alsó panel telefonon: három állás (kicsi, közepes, teljes képernyő), teljes képernyőn „˅ Parkolás” sáv és a kereső, a fülsor elrejtve, mint a BudapestGO-ban | Boti kérése képernyőképekkel: „budapestgoban ha az alsó sávot felhúzom, akkor felhúzódik, parkoljban nem lehet” |
| 2026-11-25 | Lejárati értesítés bezárt webappnál (Web Push saját titkosítással, `push_jobs` tábla, `push-send` Supabase-függvény percenként) és egygombos Supabase-telepítő (schema.sql, kulcsok, függvény, ütemező) | Boti „folytasd”: ő iPhone-on webappként használja, ott eddig csak nyitott appnál szólt a lejárat; a terv lejárati figyelmeztetést ír elő. A telepítővel nem kell többé kézzel SQL-t futtatni |
| 2026-11-25 | „Információk és súgó” oldal a BudapestGO mintájára, parkolásra szabva: vészhelyzet (112, elszállított vagy sérült autó), jelmagyarázat, fő funkciók, mobilparkolás működése, GYIK (9 kérdés), visszajelzés, fővárosi elérhetőség, dokumentumok, verzió. ÁSZF a fizetős indulás előtt | Boti kérése képernyőképekkel: „ilyenek vannak a BudapestGO-ban, amik relevánsak, vedd át” |
| 2026-11-25 | Asztali menü a BudapestGO mintájára: jobb felső pirula (óra + menügomb), lenyíló menü ikonos sorokkal, Nyelv almenü, Hibabejelentés Ctrl+U gyorsbillentyűvel, Névjegy oldal; a bal sáv alján hibabejelentés és logó; asztalon nincs külön Menü fül | Boti kérése képernyőképpel: „ilyen legyen nekünk is ez a menü” |
