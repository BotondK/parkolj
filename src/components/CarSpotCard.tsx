// „Hol hagytam az autót?”: szint, jegyzet, fotó az aktív jegyen (mindenkinek). A fotó csak a készüléken marad.
import { useEffect, useState } from 'react';
import { Image, Pressable, Text, TextInput, View } from 'react-native';
import type { AccStrings } from '../i18nAccount';
import { loadCarPhoto, pickCarPhoto, saveCarPhoto } from '../logic/carPhoto';
import { C, Chip, styles } from './ui';

const FLOORS = ['street', '-3', '-2', '-1', '0', '1', '2', '3', '4'];

export const floorLabel = (f: string, a: AccStrings) => (f === 'street' ? a.floorStreet : f === '0' ? a.floorGround : `${f}. ${a.floor.toLowerCase()}`);

export default function CarSpotCard({
  a,
  photoKey,
  spot,
  floor,
  garage,
  onChange,
}: {
  a: AccStrings;
  /** A parkolás kezdési ideje: ehhez kötjük a fotót */
  photoKey: number;
  spot?: string;
  floor?: string;
  garage: boolean;
  onChange: (p: { spot?: string; floor?: string }) => void;
}) {
  const [draft, setDraft] = useState(spot ?? '');
  const [photo, setPhoto] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  useEffect(() => {
    loadCarPhoto(photoKey).then(setPhoto);
  }, [photoKey]);
  const take = async (camera: boolean) => {
    setMsg(null);
    const r = await pickCarPhoto(camera).catch(() => null);
    if (r === 'denied') return setMsg(a.photoDenied);
    if (!r) return;
    setPhoto(r);
    saveCarPhoto(photoKey, r);
  };
  const floors = garage ? FLOORS.filter((f) => f !== 'street') : FLOORS;
  return (
    <View testID="car-spot" style={[styles.card, { marginTop: 14, gap: 10 }]}>
      <View>
        <Text style={{ fontWeight: '700', color: C.text, fontSize: 16 }}>{a.carSpot}</Text>
        <Text style={{ color: C.sub, fontSize: 12, marginTop: 2 }}>{a.carSpotSub}</Text>
      </View>
      <Text style={{ color: C.sub, fontWeight: '700', fontSize: 13 }}>{a.floor}</Text>
      <View style={styles.chipRow}>
        {floors.map((f) => (
          <Chip key={f} text={f === 'street' ? a.floorStreet : f === '0' ? a.floorGround : f} active={floor === f} onPress={() => onChange({ floor: floor === f ? undefined : f })} />
        ))}
      </View>
      <TextInput
        accessibilityLabel={a.spotTitle}
        value={draft}
        onChangeText={setDraft}
        onBlur={() => draft.trim() !== (spot ?? '') && onChange({ spot: draft.trim() || undefined })}
        onSubmitEditing={() => onChange({ spot: draft.trim() || undefined })}
        placeholder={a.spotPlaceholder}
        placeholderTextColor={C.sub}
        maxLength={120}
        style={{ height: 46, borderRadius: 12, borderWidth: 1, borderColor: C.line, paddingHorizontal: 12, fontSize: 15, color: C.text, backgroundColor: C.card }}
      />
      {photo ? (
        <View style={{ gap: 8 }}>
          <Image source={{ uri: photo }} accessibilityLabel={a.photoAlt} style={{ width: '100%', height: 200, borderRadius: 12, backgroundColor: C.soft }} resizeMode="cover" />
          <Pressable
            role="button"
            onPress={() => {
              setPhoto(null);
              saveCarPhoto(photoKey, null);
            }}
            style={{ alignSelf: 'flex-start' }}
          >
            <Text style={{ color: C.danger, fontWeight: '700' }}>{a.removePhoto}</Text>
          </Pressable>
        </View>
      ) : (
        <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
          <Pressable role="button" style={[styles.navBtn, { flex: 1, minWidth: 140 }]} onPress={() => take(true)}>
            <Text style={styles.navBtnText}>📷 {a.takePhoto}</Text>
          </Pressable>
          <Pressable role="button" style={[styles.navBtn, { flex: 1, minWidth: 140 }]} onPress={() => take(false)}>
            <Text style={styles.navBtnText}>🖼 {a.pickPhoto}</Text>
          </Pressable>
        </View>
      )}
      {msg && <Text style={{ color: C.warn, fontSize: 13 }}>{msg}</Text>}
    </View>
  );
}
