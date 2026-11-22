import { useState } from 'react';
import { Linking, Platform, Pressable, ScrollView, Switch, Text, TextInput, View } from 'react-native';
import { MARKER_COLORS } from '../components/mapTypes';
import { Icon } from '../components/icons';
import { BackLink, C, Chip, Meta, PrimaryButton, styles, zoneText } from '../components/ui';
import type { Place } from '../data/places';
import { zoneAt } from '../logic/geo';
import { ZONE_CODES } from '../data/zoneCodes';
import { chargeableMinutes, formatClock, formatDuration, formatFt, isCharging, paidEnd, priceWindow } from '../logic/pricing';
import type { ParkingOption } from '../logic/recommend';
import type { Lang, Strings } from '../i18n';
import type { AccStrings } from '../i18nAccount';
import { COUNTRIES, plateValid, type Car, type Session } from '../types';

export function chargeFor(s: Session) {
  const z = s.option.zone;
  if (!z) return 0;
  const used = Math.min(s.elapsedSec / 60, s.durationMin);
  return priceWindow(z, new Date(s.startedAt), used);
}

export function titleOf(o: ParkingOption, t: Strings) {
  if (o.kind === 'garage') return `${t.garage}: ${o.garage?.name}`;
  if (o.kind === 'here') return t.hereTitle;
  return o.kind === 'fastest' ? t.fastest : t.cheapest;
}

export function describe(o: ParkingOption, t: Strings) {
  if (o.kind === 'garage') return `${o.distanceM} m · ${o.walkMin} ${t.minutes} ${t.walk}`;
  if (o.kind === 'here') return t.hereSub;
  return `${o.distanceM} m ${t.directions[o.bearing]} ${t.fromDest} · ${o.walkMin} ${t.minutes} ${t.walk}`;
}

export function navApps(o: ParkingOption) {
  const { lat, lng } = o.coord;
  return [
    { name: 'Google Maps', url: `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving` },
    { name: 'Apple Maps', url: `https://maps.apple.com/?daddr=${lat},${lng}&dirflg=d` },
    { name: 'Waze', url: `https://waze.com/ul?ll=${lat},${lng}&navigate=yes` },
  ];
}


export function SearchStep({
  t,
  query,
  setQuery,
  results,
  onPick,
  lang,
  hideInput,
}: {
  t: Strings;
  query: string;
  setQuery: (s: string) => void;
  results: Place[];
  onPick: (p: Place) => void;
  lang: Lang;
  /** Asztali nézetben a keresőmező a panel tetején van */
  hideInput?: boolean;
}) {
  const icon: Record<string, string> = { theatre: '🎭', cinema: '🎬', concert: '🎻', sight: '🏛️', mall: '🛍️', sport: '🏟️', address: '📍' };
  return (
    <View>
      {!hideInput && <SearchInput t={t} query={query} setQuery={setQuery} />}
      <Text style={[styles.label, hideInput && { marginTop: 0 }]}>{query ? '' : t.popular}</Text>
      {results.length === 0 && <Text style={styles.sub}>{t.noResults}</Text>}
      {results.map((p) => (
        <Pressable key={p.id} style={styles.result} onPress={() => onPick(p)}>
          <Text style={{ fontSize: 22 }}>{icon[p.kind]}</Text>
          <View style={{ flex: 1 }}>
            <Text style={{ fontWeight: '600', color: C.text, fontSize: 15 }}>{lang !== 'hu' && p.nameEn ? p.nameEn : p.name}</Text>
            <Text style={{ color: C.sub, fontSize: 13 }}>{p.address}</Text>
          </View>
          <Text style={{ color: C.sub }}>›</Text>
        </Pressable>
      ))}
    </View>
  );
}

export function SearchInput({
  t,
  query,
  setQuery,
  onFocus,
  placeholder,
  autoFocus,
}: {
  t: Strings;
  query: string;
  setQuery: (s: string) => void;
  onFocus?: () => void;
  placeholder?: string;
  autoFocus?: boolean;
}) {
  return (
    <View>
      <TextInput
        value={query}
        onChangeText={setQuery}
        onFocus={onFocus}
        autoFocus={autoFocus}
        placeholder={placeholder ?? t.searchPlaceholder}
        placeholderTextColor={C.sub}
        style={styles.search}
        autoCorrect={false}
      />
      <View pointerEvents="none" style={{ position: 'absolute', left: 14, top: 15 }}>
        <Icon name="search" size={26} color={C.text} />
      </View>
    </View>
  );
}

export function DestZone({ dest, t }: { dest: Place; t: Strings }) {
  const z = zoneAt(dest);
  if (!z) return <Text>{t.outsideZones}</Text>;
  return (
    <Text style={{ color: zoneText(z.color), fontWeight: '700' }}>
      {z.id} {t.zone} · {formatFt(z.pricePerHour)}
      {t.perHour}
    </Text>
  );
}

export function OptionCard({
  o,
  t,
  lang,
  stay,
  active,
  onPress,
}: {
  o: ParkingOption;
  t: Strings;
  lang: Lang;
  stay: number;
  active: boolean;
  onPress: () => void;
}) {
  const color = MARKER_COLORS[o.kind];
  const sub = o.kind === 'fastest' ? t.fastestSub : o.kind === 'cheapest' ? t.cheapestSub : t.garageSub;
  const over = o.maxMinutes != null && stay > o.maxMinutes;
  return (
    <Pressable onPress={onPress} style={[styles.card, styles.option, active && { borderColor: color, borderWidth: 2 }]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View style={[styles.badge, { backgroundColor: color, borderRadius: o.kind === 'garage' ? 8 : 999 }]}>
          <Text style={{ color: '#fff', fontWeight: '800' }}>{o.kind === 'fastest' ? '1' : o.kind === 'cheapest' ? '2' : 'P'}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontWeight: '700', fontSize: 16, color: C.text }}>
            {o.kind === 'garage' ? o.garage?.name : o.kind === 'fastest' ? t.fastest : t.cheapest}
          </Text>
          <Text style={{ color: C.sub, fontSize: 13 }}>{sub}</Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={{ fontWeight: '800', fontSize: 17, color: C.text }}>{o.zone && o.cost === 0 ? t.free : formatFt(o.cost)}</Text>
          <Text style={{ color: C.sub, fontSize: 12 }}>{formatDuration(over ? o.maxMinutes! : stay, lang)}</Text>
        </View>
      </View>
      <View style={styles.metaRow}>
        <Meta text={`🚶 ${o.walkMin} ${t.minutes}`} />
        {o.kind === 'garage' ? (
          o.garage?.realCapacity ? <Meta text={t.places(o.garage.realCapacity)} /> : null
        ) : (
          <Meta text={`${Math.round(o.availability * 100)}% ${t.chance}`} tone={o.availability > 0.6 ? 'good' : o.availability > 0.4 ? 'mid' : 'bad'} />
        )}
        {o.zone && <Meta text={`${o.zone.id} ${t.zone} · ${o.zone.pricePerHour} Ft${t.perHour}`} />}
        {o.kind === 'garage' && <Meta text={t.approxPerHour(o.garage?.pricePerHour ?? 0)} />}
        {o.kind === 'garage' && o.garage?.hours === '24/7' && <Meta text={t.open247} />}
        {o.kind === 'garage' && o.garage?.customersOnly && <Meta text={t.customersOnly} tone="mid" />}
        {o.kind === 'garage' && o.garage?.bookable && <Meta text={t.bookable} tone="good" />}
      </View>
      {over && <Text style={{ color: C.warn, fontSize: 12, marginTop: 8 }}>{t.rule3h}</Text>}
      {o.freeFrom && <Text style={{ color: C.good, fontSize: 12, marginTop: 8 }}>{t.freeFrom(o.freeFrom)}</Text>}
    </Pressable>
  );
}

export function PayStep({
  t,
  lang,
  option,
  cars,
  carId,
  setCarId,
  onAddCar,
  duration,
  setDuration,
  payMethod,
  setPayMethod,
  payOptions,
  profileOptions,
  profileId,
  setProfileId,
  credit,
  onManagePay,
  a,
  plusSlot,
  plusFee = 0,
  onBack,
  onPay,
}: {
  plusSlot?: React.ReactNode;
  /** Alkalmi Plusz díja, a fizetendőhöz adódik */
  plusFee?: number;
  t: Strings;
  lang: Lang;
  option: ParkingOption;
  cars: Car[];
  carId: string | null;
  setCarId: (id: string) => void;
  onAddCar: (plate: string, country: string) => void;
  duration: number;
  setDuration: (n: number) => void;
  payMethod: string;
  setPayMethod: (m: string) => void;
  /** Mentett kártyák + Apple/Google Pay */
  payOptions: { id: string; label: string }[];
  /** Számlázási profilok (magán / céges) + „nyugta” */
  profileOptions: { id: string; label: string }[];
  profileId: string;
  setProfileId: (id: string) => void;
  /** Kuponjóváírás (Ft), levonjuk a díjból */
  credit: number;
  onManagePay: () => void;
  a: AccStrings;
  onBack: () => void;
  onPay: () => void;
}) {
  const z = option.zone;
  const max = z?.maxMinutes ?? 600;
  const now = new Date();
  const price = z ? priceWindow(z, now, duration) : 0;
  const charging = z ? isCharging(z, now) : false;
  const pe = z ? paidEnd(z, now) : null;
  const endsFree = pe && pe.getTime() < now.getTime() + duration * 60000;
  const paidMin = z ? chargeableMinutes(z, now, duration) : 0;
  const [code, setCode] = useState(z?.smsCode ?? '');
  const smsNumber = code ? `+3630763${code}` : '';
  const end = new Date(Date.now() + duration * 60000);
  const plate = cars.find((c) => c.id === carId)?.plate ?? '';
  const used = Math.min(credit, price);
  return (
    <View>
      <BackLink t={t} onPress={onBack} />
      <Text style={styles.h1}>{t.startParking}</Text>
      {z && (
        <View style={[styles.zonePill, { backgroundColor: `${z.color}22` }]}>
          <Text style={{ color: zoneText(z.color), fontWeight: '800' }}>
            {z.id} {t.zone} · {z.pricePerHour} Ft{t.perHour} · {z.maxMinutes ? `${t.maxStay} ${formatDuration(z.maxMinutes, lang)}` : t.noLimit}
          </Text>
        </View>
      )}
      {!charging && <Text style={[styles.sub, { marginTop: 8 }]}>{t.notCharging}</Text>}
      {endsFree && pe && (
        <View style={[styles.banner, { backgroundColor: C.goodSoft, marginTop: 10, marginBottom: 0 }]}>
          <Text style={{ color: C.good, fontWeight: '600' }}>{t.autoStopNote(formatClock(pe), formatDuration(paidMin, lang))}</Text>
        </View>
      )}

      <Text style={styles.label}>{t.myCars}</Text>
      <CarPicker t={t} cars={cars} carId={carId} setCarId={setCarId} onAddCar={onAddCar} />

      <Text style={styles.label}>{t.duration}</Text>
      <View style={styles.stepper}>
        <Pressable style={styles.stepBtn} onPress={() => setDuration(Math.max(15, duration - 15))}>
          <Text style={styles.stepBtnText}>−</Text>
        </Pressable>
        <View style={{ alignItems: 'center', flex: 1 }}>
          <Text style={{ fontSize: 26, fontWeight: '800', color: C.text }}>{formatDuration(duration, lang)}</Text>
          <Text style={{ color: C.sub }}>
            {t.endsAt}: {formatClock(endsFree && pe ? pe : end)} · {formatFt(price)}
          </Text>
        </View>
        <Pressable
          style={[styles.stepBtn, duration + 15 > max && { opacity: 0.35 }]}
          onPress={() => setDuration(Math.min(max, duration + 15))}
        >
          <Text style={styles.stepBtnText}>+</Text>
        </Pressable>
      </View>
      {z?.maxMinutes && <Text style={{ color: C.warn, fontSize: 12, marginTop: 8 }}>{t.rule3h}</Text>}

      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <Text style={styles.label}>{a.payMethod}</Text>
        <Pressable onPress={onManagePay} hitSlop={8}>
          <Text style={{ color: C.brand, fontWeight: '700' }}>{a.manage} ›</Text>
        </Pressable>
      </View>
      <View style={styles.chipRow}>
        {payOptions.map((o) => (
          <Chip key={o.id} text={o.label} active={payMethod === o.id} onPress={() => setPayMethod(o.id)} />
        ))}
        <Chip text={a.addPayment} active={false} onPress={onManagePay} />
      </View>
      <Text style={styles.label}>{a.invoiceTo}</Text>
      <View style={styles.chipRow}>
        {profileOptions.map((o) => (
          <Chip key={o.id} text={o.label} active={profileId === o.id} onPress={() => setProfileId(o.id)} />
        ))}
      </View>
      {plusSlot}
      {used > 0 && <Text style={{ color: C.good, fontWeight: '600', marginTop: 6 }}>{a.creditApplied(formatFt(used))}</Text>}
      <Text style={[styles.sub, { fontSize: 12 }]}>{t.demoPay}</Text>

      <PrimaryButton text={price === 0 && !plusFee ? t.startFree : `${t.payAndStart} · ${formatFt(price - used + plusFee)}`} onPress={onPay} disabled={!plate} />

      {z && (
        <View style={[styles.card, { marginTop: 18 }]}>
          <Text style={{ color: C.sub, fontSize: 13 }}>{t.smsFallback}</Text>
          <Text style={{ color: C.sub, fontSize: 12, marginTop: 8 }}>{t.zoneCodeHint(z.id)}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingVertical: 8 }}>
            {ZONE_CODES[z.id].map(([c, d]) => (
              <Pressable key={c} onPress={() => setCode(c)} style={[styles.countryChip, code === c && styles.chipOn]}>
                <Text style={{ fontWeight: '700', color: code === c ? C.onBrand : C.text }}>{c}</Text>
                <Text style={{ fontSize: 10, color: code === c ? C.onBrand : C.sub, textAlign: 'center' }}>{d}.</Text>
              </Pressable>
            ))}
          </ScrollView>
          <Text style={{ fontWeight: '700', marginTop: 2, color: C.text }} selectable>
            {plate} → {smsNumber}
          </Text>
          <Pressable
            onPress={() => Linking.openURL(`sms:${smsNumber}${Platform.OS === 'ios' ? '&' : '?'}body=${encodeURIComponent(plate)}`)}
            style={[styles.navBtn, { marginTop: 10 }]}
          >
            <Text style={styles.navBtnText}>{t.smsSend}</Text>
            <Text style={{ color: C.sub }}>✉</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

export function ActiveStep({
  t,
  lang,
  s,
  demoSpeed,
  setDemoSpeed,
  onExtend,
  onStop,
  onGarage,
  extra,
}: {
  extra?: React.ReactNode;
  t: Strings;
  lang: Lang;
  s: Session;
  demoSpeed: boolean;
  setDemoSpeed: (b: boolean) => void;
  onExtend: () => void;
  onStop: () => void;
  onGarage: () => void;
}) {
  const leftSec = Math.max(0, s.durationMin * 60 - s.elapsedSec);
  const pct = Math.min(1, s.elapsedSec / (s.durationMin * 60));
  const endAt = new Date(s.startedAt + s.durationMin * 60000);
  const max = s.option.zone?.maxMinutes;
  const atLimit = max != null && s.durationMin + 15 > max;
  const color = leftSec <= 600 ? (leftSec === 0 ? C.danger : C.warn) : C.brand;
  const hh = Math.floor(leftSec / 3600);
  const mm = Math.floor((leftSec % 3600) / 60);
  const ss = leftSec % 60;
  return (
    <View>
      <Text style={styles.h1}>{t.active}</Text>
      <Text style={styles.sub}>
        {s.plate} · {s.option.zone ? `${s.option.zone.id} ${t.zone}` : ''} · {t.endsAt} {formatClock(endAt)}
      </Text>
      <View style={[styles.card, { alignItems: 'center', marginTop: 14, paddingVertical: 24 }]}>
        <Text style={{ fontSize: 48, fontWeight: '800', color, fontVariant: ['tabular-nums'] }}>
          {hh}:{mm.toString().padStart(2, '0')}:{ss.toString().padStart(2, '0')}
        </Text>
        <Text style={{ color: C.sub }}>{t.remaining}</Text>
        <View style={styles.progress}>
          <View style={{ width: `${pct * 100}%`, height: '100%', backgroundColor: color, borderRadius: 99 }} />
        </View>
        <Text style={{ color: C.sub, marginTop: 10 }}>
          {t.costSoFar}: <Text style={{ fontWeight: '800', color: C.text }}>{formatFt(chargeFor(s))}</Text>
        </Text>
      </View>
      <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
        <Pressable style={[styles.secondary, atLimit && { opacity: 0.4 }]} onPress={onExtend}>
          <Text style={styles.secondaryText}>{t.extend}</Text>
        </Pressable>
        <Pressable style={[styles.secondary, { borderColor: C.danger }]} onPress={onStop}>
          <Text style={[styles.secondaryText, { color: C.danger }]}>{t.stop}</Text>
        </Pressable>
      </View>
      {extra}
      {atLimit && (
        <View style={[styles.card, { marginTop: 14, backgroundColor: C.warnSoft, borderColor: C.warnSoft }]}>
          <Text style={{ color: C.warn, fontWeight: '600' }}>{t.limitReached}</Text>
          <Pressable onPress={onGarage} style={{ marginTop: 8 }}>
            <Text style={{ color: C.brand, fontWeight: '700' }}>{t.suggestGarage} →</Text>
          </Pressable>
        </View>
      )}
      <Pressable
        style={[styles.navBtn, { marginTop: 14 }]}
        onPress={() =>
          Linking.openURL(
            `https://www.google.com/maps/dir/?api=1&destination=${s.option.coord.lat},${s.option.coord.lng}&travelmode=walking`,
          )
        }
      >
        <Text style={styles.navBtnText}>🚶 {t.backToCar}</Text>
        <Text style={{ color: C.sub }}>↗</Text>
      </Pressable>
      <View style={styles.demoRow}>
        <Text style={{ color: C.sub, flex: 1, fontSize: 13 }}>{t.demoSpeed}</Text>
        <Switch accessibilityLabel={t.demoSpeed} value={demoSpeed} onValueChange={setDemoSpeed} />
      </View>
    </View>
  );
}


export function CarPicker({
  t,
  cars,
  carId,
  setCarId,
  onAddCar,
  formOnly,
  onCancel,
}: {
  t: Strings;
  cars: Car[];
  carId: string | null;
  setCarId: (id: string) => void;
  onAddCar: (plate: string, country: string) => void;
  /** Csak az új autó űrlapja (Kedvenceim › Autók) */
  formOnly?: boolean;
  onCancel?: () => void;
}) {
  const [addingS, setAdding] = useState(cars.length === 0);
  const adding = formOnly || addingS;
  const [plate, setPlate] = useState('');
  const [country, setCountry] = useState('H');
  const valid = plateValid(plate, country);
  return (
    <View>
      {!formOnly && <View style={styles.chipRow}>
        {cars.map((c) => (
          <Chip key={c.id} active={c.id === carId && !adding} onPress={() => { setCarId(c.id); setAdding(false); }} text={`${c.country} · ${c.plate}`} />
        ))}
        {!adding && <Chip active={false} onPress={() => setAdding(true)} text={t.addCar} />}
      </View>}
      {adding && (
        <View style={[styles.card, { gap: 10 }]}>
          <Text style={{ color: C.sub, fontSize: 13 }}>{t.country}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
            {COUNTRIES.map((c) => (
              <Pressable key={c} onPress={() => setCountry(c)} style={[styles.countryChip, country === c && styles.chipOn]}>
                <Text style={{ fontWeight: '700', color: country === c ? C.onBrand : C.text }}>{c}</Text>
              </Pressable>
            ))}
          </ScrollView>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <View style={styles.euBand}>
              <Text style={{ color: '#FDE047', fontSize: 9 }}>★</Text>
              <Text style={{ color: '#fff', fontWeight: '800', fontSize: 12 }}>{country}</Text>
            </View>
            <TextInput
              accessibilityLabel={t.plate}
              value={plate}
              onChangeText={(v) => setPlate(v.toUpperCase())}
              placeholder={country === 'H' ? 'ABC-123' : 'B-AB 1234'}
              placeholderTextColor={C.sub}
              autoCapitalize="characters"
              autoCorrect={false}
              style={[styles.search, { flex: 1, minWidth: 0, width: '100%', fontWeight: '800', letterSpacing: 2, fontSize: 18, paddingVertical: 10, paddingLeft: 14, borderRadius: 12, borderWidth: 1, borderColor: C.line, backgroundColor: C.card, shadowOpacity: 0, elevation: 0 }]}
            />
          </View>
          {plate.length > 0 && !valid && <Text style={{ color: C.warn, fontSize: 12 }}>{t.plateInvalid}</Text>}
          {country !== 'H' && <Text style={{ color: C.sub, fontSize: 12 }}>{t.foreignHint}</Text>}
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {(cars.length > 0 || onCancel) && (
              <Pressable style={[styles.secondary, { paddingVertical: 10 }]} onPress={() => (onCancel ? onCancel() : setAdding(false))}>
                <Text style={styles.secondaryText}>{t.cancel}</Text>
              </Pressable>
            )}
            <Pressable
              style={[styles.secondary, { paddingVertical: 10, backgroundColor: C.primary, borderColor: C.primary }, !valid && { opacity: 0.4 }]}
              onPress={() => {
                if (!valid) return;
                onAddCar(plate.trim(), country);
                setPlate('');
                setAdding(false);
                onCancel?.();
              }}
            >
              <Text style={[styles.secondaryText, { color: C.onPrimary }]}>{t.save}</Text>
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );
}
