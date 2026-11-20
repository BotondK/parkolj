import * as Location from 'expo-location';
import type { LatLng } from '../data/zones';

/** Saját helyzet. null, ha nincs engedély vagy nem elérhető (pl. beágyazott weboldalon). */
export async function locate(): Promise<LatLng | null> {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return null;
    const pos = await Promise.race([
      Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
      new Promise<null>((r) => setTimeout(() => r(null), 8000)),
    ]);
    return pos ? { lat: pos.coords.latitude, lng: pos.coords.longitude } : null;
  } catch {
    return null;
  }
}
