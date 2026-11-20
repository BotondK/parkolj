# Szerver és adatbázis ingyenesen (Neon + Render)

A kód kész: a szerver (`server/`) PostgreSQL-t használ, ha kap `DATABASE_URL`-t, és első induláskor maga hozza létre a táblát. Neked csak regisztrálni kell, kb. 10 perc.

## 1. Adatbázis: Neon (ingyenes PostgreSQL)

1. Regisztrálj: https://neon.tech (GitHub-fiókkal a leggyorsabb).
2. **Create project** → név: `parkolj`, régió: **AWS Europe Central 1 (Frankfurt)**, Postgres 16 vagy újabb.
3. A **Connection string** dobozból másold ki a címet (`postgresql://...neon.tech/neondb?sslmode=require`). Ez a `DATABASE_URL`. Titok, ne tedd a repóba.

Az ingyenes csomag 0,5 GB tárhelyet ad, ez a pilothoz bőven elég. Ha 5 percig nincs forgalom, elalszik, az első kérés pár száz ms-mal lassabb.

## 2. Szerver: Render (ingyenes webszolgáltatás)

1. Regisztrálj: https://render.com (GitHub-fiókkal), és engedd hozzá a `BotondK/parkolj` repót.
2. Nyisd meg: https://render.com/deploy?repo=https://github.com/BotondK/parkolj
   A repóban lévő `render.yaml` mindent beállít (Frankfurt, ingyenes csomag, `server/` mappa, `/health` ellenőrzés).
3. Amikor kéri a `DATABASE_URL` értékét, illeszd be a Neon címét → **Apply**.
4. Pár perc múlva kapsz egy címet, pl. `https://parkolj-api.onrender.com`. Ellenőrzés: `https://parkolj-api.onrender.com/health` → `{"ok":true,"storage":"external"}`.

Az ingyenes Render 15 perc tétlenség után leáll, az első kérés ilyenkor kb. 30–60 másodperc. Az app emiatt nem akad meg: a szerver nélkül is működik, a szinkron csak a háttérben próbálkozik.

## 3. Az app összekötése a szerverrel

- **Webes demó (GitHub Pages):** a repóban **Settings → Secrets and variables → Actions → Variables → New repository variable**, név: `API_URL`, érték: a Render címe (perjel nélkül). Utána **Actions → Webes demó → Run workflow**, vagy a következő push.
- **Telefonos build / helyi futtatás:** `EXPO_PUBLIC_API_URL=https://parkolj-api.onrender.com npx expo start`
- Ha nincs beállítva, az app pontosan úgy működik, mint eddig (minden a telefonon marad).

Mit küld az app: parkolás indítása (hely, rendszám, időtartam), hosszabbítás, leállítás. Ebből számolja a szerver az anonim (k=5) kihasználtsági statisztikát a BKK-nak: `/v1/stats/occupancy`.

## Ha később fizetősre váltanátok

Render Starter (kb. 7 USD/hó) nem alszik el; Neon Launch akkor kell, ha a tárhely kevés. Kódot egyiknél sem kell módosítani.
