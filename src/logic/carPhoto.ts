// „Hol hagytam az autót” fotó: csak a készüléken, a parkolás kezdési idejéhez kötve. Nem megy a felhőbe.
// Telefonon a fájl útvonala (a képválasztó gyorsítótárában, órákig megmarad), weben kicsinyített data URL.
import { Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { loadJSON, saveJSON } from './storage';

type Stored = { key: number; uri: string };

export async function loadCarPhoto(key: number): Promise<string | null> {
  const s = await loadJSON<Stored | null>('carPhoto', null);
  if (s && s.key !== key) await saveJSON('carPhoto', null); // előző parkolás fotója: új parkolásnál törlődik
  return s && s.key === key ? s.uri : null;
}

export const saveCarPhoto = (key: number, uri: string | null) => saveJSON('carPhoto', uri ? { key, uri } : null);

/** Weben a fotót kicsinyítjük (hosszabbik oldal max. 1280 px, JPEG), hogy elférjen a böngésző tárolójában */
async function shrinkWeb(uri: string): Promise<string> {
  if (typeof document === 'undefined') return uri;
  const img = new Image();
  img.src = uri;
  await img.decode();
  const k = Math.min(1, 1280 / Math.max(img.naturalWidth, img.naturalHeight));
  const c = document.createElement('canvas');
  c.width = Math.round(img.naturalWidth * k);
  c.height = Math.round(img.naturalHeight * k);
  c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height);
  return c.toDataURL('image/jpeg', 0.6);
}

/** Fotó készítése vagy választása. null = mégse; 'denied' = nincs engedély */
export async function pickCarPhoto(camera: boolean): Promise<string | null | 'denied'> {
  if (Platform.OS !== 'web') {
    const perm = camera ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return 'denied';
  }
  const opts: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 0.5, allowsEditing: false, exif: false };
  const r = camera ? await ImagePicker.launchCameraAsync(opts) : await ImagePicker.launchImageLibraryAsync(opts);
  if (r.canceled || !r.assets?.[0]) return null;
  const uri = r.assets[0].uri;
  return Platform.OS === 'web' ? shrinkWeb(uri) : uri;
}
