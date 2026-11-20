# Szerver és adatbázis: Supabase + Cloudflare Workers

A kód kész. A szerver (`server/`) Cloudflare Workeren fut, az adatokat a Supabase PostgreSQL-ben tárolja, és első kéréskor maga hozza létre a táblát. Neked csak két regisztráció és pár kattintás kell, kb. 10–15 perc.

## 1. Adatbázis: Supabase

1. https://supabase.com/dashboard → **New project**
   - Name: `parkolj`, Region: **Central EU (Frankfurt)**
   - Adj meg egy erős adatbázis-jelszót, és mentsd el.
   - Az ingyenes csomagban szervezetenként 2 aktív projekt lehet; ha a másik projekted mellett ez a második, belefér.
2. A projekt tetején **Connect** → **Transaction pooler** (6543-as port) → másold ki a címet, és írd bele a jelszavad a `[YOUR-PASSWORD]` helyére:
   `postgresql://postgres.xxxx:JELSZÓ@aws-0-eu-central-1.pooler.supabase.com:6543/postgres`
   Ez a `DATABASE_URL`. Titok, ne tedd a repóba.

A tábla (`parking_sessions`) magától létrejön, sorszintű védelemmel (RLS), így a Supabase nyilvános REST API-ján nem olvasható.

## 2. Szerver: Cloudflare Workers

1. https://dash.cloudflare.com → regisztráció (ingyenes).
2. **Workers & Pages → Create → Import a repository** → kösd össze a GitHubot → `BotondK/parkolj`.
3. Beállítások:
   - Project name: `parkolj-api` (egyezzen a `server/wrangler.toml`-lal)
   - **Root directory: `server`**
   - Build command: üresen hagyható
   - Deploy command: `npx wrangler deploy`
   → **Deploy**. Ettől kezdve minden `main`-re pusholt változás automatikusan kimegy.
4. A kész Worker → **Settings → Variables and Secrets → Add** → Type: **Secret**, Name: `DATABASE_URL`, Value: a Supabase cím → **Deploy**.
5. Ellenőrzés: `https://parkolj-api.<a-te-aldomained>.workers.dev/health` → `{"ok":true,"storage":"postgres"}`

A Worker nem alszik el, nincs hidegindítás. Az 5 percenként futó időzítő (cron) lezárja a lejárt parkolásokat, és közben forgalmat ad az adatbázisnak is.

## 3. Az app összekötése a szerverrel

- **Webes demó (GitHub Pages):** repó → **Settings → Secrets and variables → Actions → Variables → New repository variable**, név: `API_URL`, érték: a Worker címe (perjel nélkül). Utána **Actions → Webes demó → Run workflow**, vagy a következő push.
- **Telefonos build / helyi futtatás:** `EXPO_PUBLIC_API_URL=https://parkolj-api.....workers.dev npx expo start`
- Ha nincs beállítva, az app pontosan úgy működik, mint eddig (minden a telefonon marad).

Mit küld az app: parkolás indítása (hely, rendszám, időtartam), hosszabbítás, leállítás. Ebből számolja a szerver az anonim (k=5) kihasználtsági statisztikát a BKK-nak: `/v1/stats/occupancy`.

## Költségek

| | Ingyenes | Fizetős | Mikor kell |
|---|---|---|---|
| Cloudflare Workers | napi 100 000 kérés, cron benne van, üzleti célra is használható | Workers Paid: 5 USD/hó (10 millió kérés/hó) | ha naponta több ezer aktív felhasználó lesz |
| Supabase | 500 MB adatbázis, 1 hét tétlenség után szünetel, nincs napi mentés | Pro: 25 USD/hó (napi mentés, nem szünetel) | éles, fizetős indulás előtt (pénzügyi adatok mentése miatt) |

A pilothoz és a zárt bétához (50–100 fő) mindkét ingyenes csomag elég. Élesben kb. 30 USD/hó (~11 000 Ft) a teljes szerveroldal.

## Helyi futtatás (fejlesztőknek)

```bash
cd server
npm install
npm run dev          # Node, http://localhost:3000 (DATABASE_URL nélkül memóriában tárol)
npm run worker:dev   # ugyanez a valódi Workers futtatókörnyezetben; titok: server/.dev.vars (DATABASE_URL=...)
npm test             # API tesztek (+ PostgreSQL teszt, ha van TEST_DATABASE_URL)
```

## Később

- **Supabase Auth** a felhasználói fiókokhoz (bejelentkezés e-maillel, Apple-lel, Google-lel), amikor az autók és előzmények szinkronja jön.
- **Hyperdrive** (Cloudflare kapcsolatgyorsító), ha az adatbázis-kérések lassúnak bizonyulnak: a `wrangler.toml`-ban előkészítve.
