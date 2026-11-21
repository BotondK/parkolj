import { Platform } from 'react-native';

/** Arc-/ujjlenyomat-azonosítás fizetés előtt (natívan). Weben nincs ilyen: ott mindig engedi. */
export async function confirmBiometric(prompt: string): Promise<boolean> {
  if (Platform.OS === 'web') return true;
  try {
    const LA = await import('expo-local-authentication');
    if (!(await LA.hasHardwareAsync()) || !(await LA.isEnrolledAsync())) return true;
    const r = await LA.authenticateAsync({ promptMessage: prompt });
    return r.success;
  } catch {
    return true;
  }
}

export const BIOMETRIC_AVAILABLE = Platform.OS !== 'web';
