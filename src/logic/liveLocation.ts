import * as Location from 'expo-location';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { LiveLocation } from './liveLocationTypes';

// Natív élő helyzet (iOS / Android). Webes változat: liveLocation.web.ts
export function useLiveLocation(): LiveLocation {
  const [fix, setFix] = useState<LiveLocation['fix']>(null);
  const [status, setStatus] = useState<LiveLocation['status']>('idle');
  const sub = useRef<Location.LocationSubscription | null>(null);

  const watch = useCallback(async () => {
    if (sub.current) return;
    setStatus('on');
    sub.current = await Location.watchPositionAsync(
      { accuracy: Location.Accuracy.High, distanceInterval: 5, timeInterval: 3000 },
      (p) => setFix({ lat: p.coords.latitude, lng: p.coords.longitude, accuracy: p.coords.accuracy ?? 50 }),
    );
  }, []);

  const start = useCallback(async () => {
    try {
      setStatus('asking');
      const { status: s } = await Location.requestForegroundPermissionsAsync();
      if (s !== 'granted') return setStatus('denied');
      await watch();
    } catch {
      setStatus('unavailable');
    }
  }, [watch]);

  useEffect(() => {
    // Ha korábban már engedélyezted, magától indul
    Location.getForegroundPermissionsAsync()
      .then((p) => {
        if (p.granted) watch();
      })
      .catch(() => {});
    return () => sub.current?.remove();
  }, [watch]);

  return { fix, status, start };
}
