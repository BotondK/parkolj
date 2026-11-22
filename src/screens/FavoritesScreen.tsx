import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Icon } from '../components/icons';
import { EmptyState, ListRow, PageHeader, PillButton, Section, SegTabs } from '../components/kit';
import { C, isDark, styles } from '../components/ui';
import type { Place } from '../data/places';
import type { Lang, Strings } from '../i18n';
import type { AccStrings } from '../i18nAccount';
import { zoneAt } from '../logic/geo';
import { usePlaceSearch } from '../logic/usePlaceSearch';
import type { Car, FavoritePlace } from '../types';
import { CarPicker, SearchInput } from './steps';

type Slot = FavoritePlace['slot'];

export default function FavoritesScreen({
  t,
  a,
  lang,
  favorites,
  setFavorites,
  onGo,
  cars,
  carId,
  setCarId,
  onAddCar,
  onRemoveCar,
}: {
  t: Strings;
  a: AccStrings;
  lang: Lang;
  favorites: FavoritePlace[];
  setFavorites: (f: FavoritePlace[]) => void;
  onGo: (p: Place) => void;
  cars: Car[];
  carId: string | null;
  setCarId: (id: string) => void;
  onAddCar: (plate: string, country: string) => void;
  onRemoveCar: (id: string) => void;
}) {
  const [tab, setTab] = useState<'places' | 'cars'>('places');
  const [picking, setPicking] = useState<Slot | null>(null);
  const [query, setQuery] = useState('');
  const [addingCar, setAddingCar] = useState(false);
  const results = usePlaceSearch(query);

  const home = favorites.find((f) => f.slot === 'home');
  const work = favorites.find((f) => f.slot === 'work');
  const custom = favorites.filter((f) => f.slot === 'custom');

  const save = (slot: Slot, p: Place) => {
    const name = lang === 'en' && p.nameEn ? p.nameEn : p.name;
    const fav: FavoritePlace = {
      id: slot === 'custom' ? `${Date.now()}` : slot,
      slot,
      label: slot === 'home' ? a.home : slot === 'work' ? a.work : name,
      name,
      address: p.address,
      lat: p.lat,
      lng: p.lng,
    };
    setFavorites([...favorites.filter((f) => slot === 'custom' || f.slot !== slot), fav]);
    setPicking(null);
    setQuery('');
  };
  const remove = (id: string) => setFavorites(favorites.filter((f) => f.id !== id));
  const go = (f: FavoritePlace) => onGo({ id: `fav-${f.id}`, name: f.name, address: f.address, kind: 'address', lat: f.lat, lng: f.lng });
  const sub = (f: FavoritePlace) => {
    const z = zoneAt(f);
    return [f.slot === 'custom' ? f.address : f.name, z ? `${z.id} ${t.zone} · ${z.pricePerHour} Ft${t.perHour}` : t.outsideZones].filter(Boolean).join(' · ');
  };

  if (picking) {
    const slotName = picking === 'home' ? a.home : picking === 'work' ? a.work : a.custom;
    return (
      <View>
        <PageHeader title={picking === 'custom' ? a.addPlace : slotName} onBack={() => setPicking(null)} />
        <Text style={[styles.sub, { marginTop: -6, marginBottom: 12 }]}>{a.pickForSlot(slotName)}</Text>
        <SearchInput t={t} query={query} setQuery={setQuery} autoFocus />
        <View style={{ height: 12 }} />
        {results.map((p) => (
          <Pressable key={p.id} style={styles.result} onPress={() => save(picking, p)}>
            <Icon name="pin" size={22} color={isDark ? C.text : C.brand} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: '600', color: C.text, fontSize: 15 }}>{lang === 'en' && p.nameEn ? p.nameEn : p.name}</Text>
              <Text style={{ color: C.sub, fontSize: 13 }}>{p.address}</Text>
            </View>
            <Icon name="plus" size={20} color={C.sub} />
          </Pressable>
        ))}
      </View>
    );
  }

  return (
    <View>
      <PageHeader title={a.tabFav} />
      <SegTabs
        tabs={[
          ['places', a.places],
          ['cars', a.cars],
        ]}
        value={tab}
        onChange={setTab}
      />
      {tab === 'places' && (
        <>
          <Section>
            {([
              ['home', a.home, home],
              ['work', a.work, work],
            ] as const).map(([slot, label, f], i) => (
              <ListRow
                key={slot}
                icon={slot}
                label={label}
                sub={f ? sub(f) : a.setPlace}
                onPress={() => (f ? go(f) : setPicking(slot))}
                last={i === 1}
                right={
                  f ? (
                    <Pressable hitSlop={10} onPress={() => remove(f.id)} role="button" accessibilityLabel={a.remove}>
                      <Icon name="close" size={20} color={C.sub} />
                    </Pressable>
                  ) : (
                    <Icon name="plus" size={20} color={C.sub} />
                  )
                }
              />
            ))}
          </Section>
          {custom.length === 0 ? (
            <EmptyState icon="star" text={a.favEmpty} />
          ) : (
            <Section>
              {custom.map((f, i) => (
                <ListRow
                  key={f.id}
                  icon="starFill"
                  label={f.label}
                  sub={sub(f)}
                  onPress={() => go(f)}
                  last={i === custom.length - 1}
                  right={
                    <Pressable hitSlop={10} onPress={() => remove(f.id)} role="button" accessibilityLabel={a.remove}>
                      <Icon name="trash" size={20} color={C.sub} />
                    </Pressable>
                  }
                />
              ))}
            </Section>
          )}
          <PillButton text={a.addPlace} icon="plus" onPress={() => setPicking('custom')} />
        </>
      )}
      {tab === 'cars' && (
        <>
          {cars.length === 0 && !addingCar && <EmptyState icon="car" text={a.carsEmpty} />}
          {cars.length > 0 && (
            <Section>
              {cars.map((c, i) => (
                <ListRow
                  key={c.id}
                  icon="car"
                  label={`${c.country} · ${c.plate}`}
                  sub={c.id === carId ? a.defaultMark : a.makeDefault}
                  onPress={c.id === carId ? undefined : () => setCarId(c.id)}
                  last={i === cars.length - 1}
                  right={
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                      {c.id === carId && <Icon name="check" size={20} color={C.good} />}
                      <Pressable hitSlop={10} onPress={() => onRemoveCar(c.id)} role="button" accessibilityLabel={a.remove}>
                        <Icon name="trash" size={20} color={C.sub} />
                      </Pressable>
                    </View>
                  }
                />
              ))}
            </Section>
          )}
          {addingCar ? (
            <CarPicker t={t} cars={cars} carId={carId} setCarId={setCarId} onAddCar={onAddCar} formOnly onCancel={() => setAddingCar(false)} />
          ) : (
            <PillButton text={a.addCar} icon="plus" onPress={() => setAddingCar(true)} />
          )}
        </>
      )}
    </View>
  );
}
