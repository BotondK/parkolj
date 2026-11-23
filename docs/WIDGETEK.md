# Kezdőképernyő-widgetek (2026-11-23)

Két widget a telefonos appokhoz. A webes demóban előnézetként látszanak és kipróbálhatók: Menü → Widgetek.

| Widget | Méretek | Mit mutat | Gombok |
| --- | --- | --- | --- |
| **Parkolásom** | iPhone: kicsi, közepes, zárolt képernyő (kör, téglalap, egysoros). Android: 4×2, átméretezhető, Android 16-tól zárolt képernyőn is | Zóna, rendszám, hely, hátralévő idő (iPhone: élő, másodpercre pontos visszaszámlálás; Android: a lejárat pontos ideje), előrehaladás sáv; 10 perccel lejárat előtt figyelmeztető szín, lejáratkor „Lejárt” | +15 perc (ha a 3 órás szabály engedi), Leállítás; ha nincs parkolás: Parkolás itt |
| **Gyors indítás** | iPhone: kicsi, közepes. Android: 4×1, átméretezhető | Parkolás itt, Otthon, Munkahely (a mentett hely nevével) | Mindhárom egy koppintás |

A gombok mélylinkkel nyitják az appot (`parkolj://widget/extend`, `/stop`, `/here`, `/home`, `/work`, `/open`), és ugyanazt csinálják, mint az app saját gombjai (a hosszabbítás ugyanúgy ellenőrzi a zóna maximumát). A widget nem fizet és nem indít parkolást az app megnyitása nélkül.

## Felépítés

- `src/widgets/widgetModel.ts`: közös adat (WidgetData), állapotok, feliratok HU/EN/DE, színek, ikonok. Egységteszt: `tests/plus.test.ts`.
- Az app minden lényeges változáskor (indítás, hosszabbítás, leállítás, kedvencek, nyelv) elmenti a pillanatképet: `src/widgets/sync.*`.
- Android: `src/widgets/android/` (react-native-android-widget). A rendszer félóránként is frissíti; ilyenkor az app nélkül, az elmentett pillanatképből rajzol (`register.android.ts` → `widgetTask.tsx`).
- iPhone: `targets/widget/` (SwiftUI + WidgetKit, a @bacons/apple-targets plugin köti be prebuildkor). Az adat a közös App Group tárban van: `group.hu.parkolj.app`. A visszaszámlálást a rendszer végzi, ezért az app futása nélkül is pontos. iOS 17-től.
- Webes előnézet: `src/widgets/WidgetPreviews.tsx`, `src/screens/WidgetsScreen.tsx`. Az Android widgetválasztó képei: `assets/widgets/`.

## Telefonos build előtt

1. `app.json` → `ios.appleTeamId`: az Apple fejlesztői fiók csapatazonosítója (Xcode → Signing, vagy developer.apple.com → Membership).
2. Az App Group (`group.hu.parkolj.app`) az EAS buildnél automatikusan regisztrálódik az Apple-nél; ha nem, a developer.apple.com-on kell felvenni, és mind a `hu.parkolj.app`, mind a `hu.parkolj.app.widget` azonosítóhoz hozzárendelni.
3. Expo Go-ban a widget nem működik (natív kód), development vagy preview build kell: lásd `docs/TELEFONOS_BUILD.md`.
4. Ellenőrizve: `npx expo prebuild` mindkét platformra hibátlanul legenerálja a widgeteket (Android: 2 widget a manifestben előnézeti képpel; iOS: ParkoljWidget target App Group jogosultsággal). Fordítani Mac/EAS kell, ezt a felhőben nem tudtam kipróbálni.
