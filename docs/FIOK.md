# Fiók és szinkron (Supabase) beállítása

Az app kulcsok nélkül is működik: ilyenkor a fiók csak az adott eszközön él. Ha megadod a Supabase adatait,
bekapcsol az e-mailes belépés (jelszó nélkül, 6 jegyű kóddal), és a következők minden eszközön meglesznek:
autók, kedvencek, bankkártyák (csak márka + utolsó 4 számjegy + lejárat), számlázási profilok, lezárt parkolások, beállítások.

Kb. 10 perc, ingyenes csomagban is megy.

## 1. Adatbázis

1. Supabase Dashboard → a projekted → **SQL Editor** → New query.
2. Másold be a [`supabase/schema.sql`](../supabase/schema.sql) tartalmát → **Run**.

Ez létrehozza a `user_data` táblát, sorszintű jogosultsággal (mindenki csak a saját adatát látja),
egy védelmet, hogy teljes kártyaszám ne kerülhessen be, és a „Fiók törlése” funkciót. Többször is futtatható.

## 2. Belépés e-mail kóddal

1. **Authentication → Sign In / Providers → Email**: legyen bekapcsolva.
2. **Authentication → Emails → Magic Link** sablon: a levélben a kód legyen benne, például:

   ```html
   <h2>Parkolj belépőkód</h2>
   <p>A belépőkódod: <strong>{{ .Token }}</strong></p>
   <p>10 percig érvényes. Ha nem te kérted, hagyd figyelmen kívül.</p>
   ```

3. Élesben érdemes saját SMTP-t beállítani (Authentication → Emails → SMTP), mert a beépített küldő óránként csak pár levelet enged.

## 3. Kulcsok az apphoz

A Supabase **Project Settings → API** oldaláról kell:

| Mi | Hol | Titkos? |
| --- | --- | --- |
| Project URL | `https://….supabase.co` | nem |
| `anon` / publishable kulcs | API Keys | nem (az appba kerül, a jogosultságot a sorszintű szabályok adják) |

A `service_role` / secret kulcsot **soha** ne tedd az appba.

- **Webes demó (GitHub Pages):** GitHub → repo → Settings → Secrets and variables → Actions → **Variables** fül:
  `SUPABASE_URL` és `SUPABASE_ANON_KEY`. A következő push után a demóban megjelenik a kódos belépés.
- **Helyi futtatás / telefonos build:** `.env` fájl a projekt gyökerében:

  ```
  EXPO_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
  EXPO_PUBLIC_SUPABASE_ANON_KEY=…
  ```

## Hogyan működik

- Belépéskor a helyi (vendégként felvett) adatok és a fiókban lévők összefésülődnek: semmi nem vész el, ütközésnél a fiókban lévő nyer.
- Utána minden változás 1,5 mp-en belül a fiókba mentődik; a Menü → Fiókom oldalon látszik az állapot.
- A token magától frissül, a belépés megmarad az app újraindítása után is.
- Fiók törlése: a fiók és minden adat véglegesen törlődik a szerverről is.
- A kód: `src/logic/cloud.ts` (külső csomag nélkül, a Supabase REST API-ján), tesztek: `tests/cloud.test.ts`.
