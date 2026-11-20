# Parkolj API (alfa váz)

A `server/` mappában lévő Node + TypeScript + Fastify szerver. Ugyanazt a díj-, zóna- és ajánlólogikát használja,
mint az app (`src/logic`, `src/data`), így a kettő mindig ugyanúgy számol.

**Állapot:** a prototípus app még nem hívja, offline is működik. Az alfában ide kerül a felhasználói fiók,
a parkolások szerveroldali tárolása (PostgreSQL + PostGIS), a valódi zónahatárok és később a fizetés (NMFR).

## Futtatás
```bash
cd server
npm install
npm run dev     # http://localhost:3000
npm test        # 8 API teszt + PostgreSQL teszt, ha van TEST_DATABASE_URL
```

Környezeti változók:
- `DATABASE_URL`: PostgreSQL cím (pl. Neon). Ha nincs, memóriában tárol (újraindításkor elvész). A tábla magától létrejön.
- `CORS_ORIGINS`: vesszővel elválasztott extra engedélyezett origin (alapból github.io és a helyi Expo portok).
- `PORT`: alapból 3000.

Ingyenes hosztolás (Neon + Render): [HOSZTOLAS.md](HOSZTOLAS.md).

## Végpontok

| Metódus | Út | Mit ad |
|---|---|---|
| GET | `/health` | Él-e a szerver |
| GET | `/v1/zones` | A 4 zóna: díj, díjfizetési idő, időkorlát, pótdíj, zónakódok kerülettel, most fizetős-e |
| GET | `/v1/zone-at?lat=&lng=` | Kerület és zóna egy pontra, meddig fizetős ma |
| GET | `/v1/recommend?lat=&lng=&minutes=&arriveAt=` | A 3 javaslat (leggyorsabb, olcsóbb, garázs) |
| POST | `/v1/sessions` | Parkolás indítása: `{lat, lng, plate, country?, minutes, zoneCode?}` |
| GET | `/v1/sessions/:id` | Állapot: eltelt idő, díj, `active` / `expired` / `auto_stopped` / `stopped` |
| POST | `/v1/sessions/:id/extend` | Hosszabbítás `{minutes}` (alapból 15), a 3 órás szabályt betartatja |
| POST | `/v1/sessions/:id/stop` | Leállítás, percre pontos végösszeg |
| GET | `/v1/stats/occupancy` | Anonim városi statisztika (lásd lent) |

## Szabályok, amiket a szerver betartat
- Csak díjköteles területen indítható parkolás (különben 422).
- A, B, C zónában legfeljebb 180 perc, hosszabbítással sem több (422).
- Ha közben véget ér a díjfizetési idő, a parkolás akkor automatikusan leáll (`autoStopAt`), és csak addig számol díjat.
- Magyar rendszámnál formátumellenőrzés, külföldinél legalább 2 karakter.

## Városi adatmegosztás (BKK pilot)
A `/v1/stats/occupancy` zónakódonként és óránként adja a parkolások számát és átlagos időtartamát.
Rendszámot és pontos helyet nem ad ki, és csak olyan cellát mutat, amelyben legalább 5 parkolás van
(k-anonimitás), így egyetlen autó sem követhető vissza. Ez az alapja a BKK-nak szóló adatmegosztási ajánlatnak.
