import { useEffect, useMemo, useState } from 'react';
import { Linking, Platform, Pressable, ScrollView, Text, useColorScheme, useWindowDimensions, View } from 'react-native';
import { PillButton, Segmented } from '../components/kit';
import { applyTheme, bgForWhite, C, isDark } from '../components/ui';
import { ZONES } from '../data/zones';
import { byZone, CITY_HOURS, CITY_ZONES, cityCsv, heat, sampleCityRows, type DayFilter } from '../logic/city';
import { cloud, type CityRow } from '../logic/cloud';
import { formatFt } from '../logic/pricing';

// „Városnak” oldal (a webes demóban: ?varos). Anonim összesítés a béta parkolásaiból; amíg nincs elég, mintaadat.
// Színek: egyárnyalatú kék skála (dataviz referencia), világos és sötét módra külön lépésekkel.
const RAMP = ['#cde2fb', '#b7d3f6', '#9ec5f4', '#86b6ef', '#6da7ec', '#5598e7', '#3987e5', '#2a78d6', '#256abf', '#1c5cab', '#184f95', '#104281', '#0d366b'];
const BAR = { light: '#2a78d6', dark: '#5598e7' };
const DOW = ['', 'hétfő', 'kedd', 'szerda', 'csütörtök', 'péntek', 'szombat', 'vasárnap'];

const cellColor = (v: number, max: number) => {
  if (!v) return isDark ? '#2a2a30' : '#eeedf2';
  const i = Math.min(RAMP.length - 1, Math.floor((v / max) * (RAMP.length - 1)));
  return isDark ? RAMP[RAMP.length - 1 - i] : RAMP[i];
};

export default function CityScreen() {
  const scheme = useColorScheme();
  const [, force] = useState(0);
  useEffect(() => {
    applyTheme(scheme === 'dark');
    force((n) => n + 1);
  }, [scheme]);
  const { width } = useWindowDimensions();
  const [rows, setRows] = useState<CityRow[] | null>(null);
  const [live, setLive] = useState(false);
  const [f, setF] = useState<DayFilter>('weekday');
  const [sel, setSel] = useState<string | null>(null);

  useEffect(() => {
    let off = false;
    (async () => {
      const r = cloud ? await cloud.cityStats().catch(() => null) : null;
      if (off) return;
      if (r && r.length >= 10) {
        setRows(r);
        setLive(true);
      } else setRows(sampleCityRows());
    })();
    return () => {
      off = true;
    };
  }, []);

  const h = useMemo(() => (rows ? heat(rows, f) : null), [rows, f]);
  const zones = useMemo(() => (rows ? byZone(rows, f) : []), [rows, f]);
  if (!rows || !h) return <View style={{ flex: 1, backgroundColor: C.bg }} />;

  const total = zones.reduce((a, z) => a + z.sessions, 0);
  const avg = total ? Math.round(zones.reduce((a, z) => a + z.sessions * z.avgMinutes, 0) / total) : 0;
  const ft = zones.reduce((a, z) => a + z.totalFt, 0);
  const hourTotals = CITY_HOURS.map((hr) => CITY_ZONES.reduce((a, z) => a + h.m[z][hr], 0));
  const peak = CITY_HOURS[hourTotals.indexOf(Math.max(...hourTotals))];
  const maxZone = Math.max(1, ...zones.map((z) => z.sessions));
  const narrow = width < 640;
  const cell = narrow ? { width: 30 } : { flex: 1 };
  const card = { backgroundColor: C.card, borderRadius: 18, borderWidth: isDark ? 0 : 1, borderColor: C.line, padding: 16 } as const;
  const zColor = (id: string) => bgForWhite(ZONES.find((z) => z.id === id)?.color ?? '#888');

  const download = () => {
    const csv = cityCsv(rows);
    if (Platform.OS === 'web') {
      const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
      const el = document.createElement('a');
      el.href = url;
      el.download = `parkolj-varosi-adatok${live ? '' : '-minta'}.csv`;
      el.click();
      URL.revokeObjectURL(url);
    }
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.bg }} contentContainerStyle={{ padding: 16, paddingBottom: 48, width: '100%', maxWidth: 1000, alignSelf: 'center', gap: 16 }}>
      <View style={{ gap: 6, marginTop: 8 }}>
        <Text role="heading" style={{ fontSize: narrow ? 28 : 34, fontWeight: '900', color: isDark ? C.text : C.brand }}>
          Parkolj – adatok a városnak
        </Text>
        <Text style={{ color: C.sub, fontSize: 15, lineHeight: 22 }}>
          Anonim összesítés a Parkolj lezárt parkolásaiból zóna, nap és óra szerint. Egy csoport csak akkor jelenik meg, ha legalább 5 parkolás és 3 különböző felhasználó van benne, így egyéni utak nem azonosíthatók. Az adat a városnak ingyenes.
        </Text>
        <View style={{ alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: live ? C.goodSoft : C.warnSoft, borderRadius: 99, paddingHorizontal: 12, paddingVertical: 6, marginTop: 4 }}>
          <Text style={{ color: live ? C.good : C.warn, fontWeight: '800', fontSize: 13 }}>
            {live ? '● Élő béta-adat' : '◌ Mintaadat: a zárt béta még nem gyűjtött elég parkolást'}
          </Text>
        </View>
      </View>

      <Segmented
        options={[
          ['weekday', 'Hétköznap'],
          ['weekend', 'Hétvége'],
          ['all', 'Minden nap'],
        ]}
        value={f}
        onChange={setF}
      />

      {/* Fő számok */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
        {[
          ['Parkolások', total.toLocaleString('hu-HU')],
          ['Átlagos parkolási idő', `${avg} perc`],
          ['Befizetett díj', formatFt(ft)],
          ['Legforgalmasabb óra', `${peak}:00–${peak + 1}:00`],
        ].map(([k, v]) => (
          <View key={k} style={[card, { flexGrow: 1, flexBasis: narrow ? '45%' : '22%', gap: 4 }]}>
            <Text style={{ color: C.sub, fontSize: 13 }}>{k}</Text>
            <Text style={{ color: C.text, fontSize: narrow ? 22 : 26, fontWeight: '800', fontVariant: ['tabular-nums'] }}>{v}</Text>
          </View>
        ))}
      </View>

      {/* Hőtérkép: zóna × óra */}
      <View style={[card, { gap: 12 }]}>
        <Text style={{ color: C.text, fontSize: 18, fontWeight: '800' }}>Mikor és hol parkolnak? (parkolások száma)</Text>
        <ScrollView horizontal={narrow} showsHorizontalScrollIndicator={narrow}>
          <View style={{ gap: 3, width: narrow ? undefined : '100%' }}>
            <View style={{ flexDirection: 'row', gap: 3, marginLeft: 64 }}>
              {CITY_HOURS.map((hr) => (
                <Text key={hr} style={{ ...cell, textAlign: 'center', color: C.sub, fontSize: 11, fontVariant: ['tabular-nums'] }}>
                  {narrow && hr % 3 !== 1 ? '' : `${hr}h`}
                </Text>
              ))}
            </View>
            {CITY_ZONES.map((z) => (
              <View key={z} style={{ flexDirection: 'row', gap: 3, alignItems: 'center' }}>
                <View style={{ width: 61, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <View style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: zColor(z) }} />
                  <Text style={{ color: C.text, fontWeight: '700', fontSize: 13 }}>{z} zóna</Text>
                </View>
                {CITY_HOURS.map((hr) => {
                  const v = h.m[z][hr];
                  const key = `${z}${hr}`;
                  const label = `${z} zóna, ${hr}:00–${hr + 1}:00: ${v} parkolás`;
                  return (
                    <Pressable
                      key={hr}
                      onHoverIn={() => setSel(key)}
                      onHoverOut={() => setSel((s) => (s === key ? null : s))}
                      onPress={() => setSel(key)}
                      role="button"
                      accessibilityLabel={label}
                      {...({ title: label } as object)}
                      style={{ ...cell, height: 30, borderRadius: 4, backgroundColor: cellColor(v, h.max), borderWidth: sel === key ? 2 : 0, borderColor: C.text }}
                    />
                  );
                })}
              </View>
            ))}
          </View>
        </ScrollView>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <Text style={{ color: C.sub, fontSize: 12 }}>kevesebb</Text>
          <View style={{ flexDirection: 'row', gap: 2 }}>
            {[0, 3, 6, 9, 12].map((i) => (
              <View key={i} style={{ width: 22, height: 10, borderRadius: 3, backgroundColor: isDark ? RAMP[RAMP.length - 1 - i] : RAMP[i] }} />
            ))}
          </View>
          <Text style={{ color: C.sub, fontSize: 12 }}>több</Text>
          <Text style={{ color: C.text, fontSize: 13, marginLeft: 'auto', fontWeight: '600' }}>
            {sel ? `${sel[0]} zóna, ${sel.slice(1)}:00–${+sel.slice(1) + 1}:00: ${h.m[sel[0]][+sel.slice(1)]} parkolás` : 'Vidd az egeret vagy koppints egy cellára'}
          </Text>
        </View>
      </View>

      {/* Zónánként: sávok + táblázat */}
      <View style={[card, { gap: 12 }]}>
        <Text style={{ color: C.text, fontSize: 18, fontWeight: '800' }}>Zónánként</Text>
        {zones.map((z) => (
          <View key={z.zone} style={{ gap: 4 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ color: C.text, fontWeight: '700' }}>{z.zone} zóna</Text>
              <Text style={{ color: C.text, fontVariant: ['tabular-nums'] }}>
                {z.sessions.toLocaleString('hu-HU')} parkolás · átlag {z.avgMinutes} perc · {formatFt(z.totalFt)}
              </Text>
            </View>
            <View style={{ height: 12, borderRadius: 4, backgroundColor: isDark ? '#2a2a30' : '#eeedf2' }}>
              <View style={{ height: 12, width: `${(z.sessions / maxZone) * 100}%`, borderRadius: 4, backgroundColor: isDark ? BAR.dark : BAR.light }} />
            </View>
          </View>
        ))}
        <Text style={{ color: C.sub, fontSize: 12 }}>
          Csoportok: zóna × a hét napja ({DOW[1]}–{DOW[7]}) × óra, Budapest idő szerint. A letöltött CSV ugyanezt tartalmazza soronként.
        </Text>
        <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap' }}>
          {Platform.OS === 'web' && <PillButton text="CSV letöltése" icon="receipt" onPress={download} />}
        </View>
      </View>

      {/* Mit adhat a város számára */}
      <View style={[card, { gap: 8 }]}>
        <Text style={{ color: C.text, fontSize: 18, fontWeight: '800' }}>Élesben ezt kapja a város</Text>
        {[
          'Valós idejű kereslet zónánként és óránként, a mostani SMS- és automatás adatok mellé.',
          'Kevesebb körözés: a sofőrök a célponthoz legközelebbi, jó eséllyel szabad helyre vagy garázsba mennek.',
          'A 3 órás szabály betartása: az app figyelmeztet, és csak a zónában megengedett ideig hosszabbít.',
          'Rendezvények (színház, koncert, meccs) hatása a környék parkolására, előre tervezhetően.',
          'Nyílt, géppel olvasható formátum (CSV, később API), személyes adat nélkül.',
        ].map((s) => (
          <Text key={s} style={{ color: C.text, fontSize: 15, lineHeight: 22 }}>
            • {s}
          </Text>
        ))}
      </View>

      <Pressable role="link" onPress={() => Linking.openURL(Platform.OS === 'web' ? window.location.pathname : 'https://botondk.github.io/parkolj/')} style={{ alignSelf: 'center', padding: 8 }}>
        <Text style={{ color: isDark ? C.text : C.brand, fontWeight: '700', textDecorationLine: 'underline' }}>Vissza az apphoz</Text>
      </Pressable>
    </ScrollView>
  );
}
