import { useCallback, useEffect, useRef, useState } from 'react';
import { canLocate } from './locate';
import type { LiveLocation } from './liveLocationTypes';

// Webes élő helyzet a böngésző Geolocation API-jával (csak https-en és nem beágyazva működik).
export function useLiveLocation(): LiveLocation {
  const [fix, setFix] = useState<LiveLocation['fix']>(null);
  const [status, setStatus] = useState<LiveLocation['status']>(canLocate() ? 'idle' : 'unavailable');
  const id = useRef<number | null>(null);

  const start = useCallback(() => {
    if (!canLocate()) return setStatus('unavailable');
    if (id.current != null) return;
    setStatus((s) => (s === 'on' ? s : 'asking'));
    id.current = navigator.geolocation.watchPosition(
      (p) => {
        setStatus('on');
        setFix({ lat: p.coords.latitude, lng: p.coords.longitude, accuracy: p.coords.accuracy });
      },
      (e) => {
        if (e.code === e.PERMISSION_DENIED) {
          setStatus('denied');
          if (id.current != null) navigator.geolocation.clearWatch(id.current);
          id.current = null;
        }
        // Időtúllépésnél vagy jelvesztésnél a böngésző tovább próbálkozik
      },
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 30000 },
    );
  }, []);

  useEffect(() => {
    // Ha a böngészőben már engedélyezted, magától indul
    try {
      navigator.permissions
        ?.query({ name: 'geolocation' as PermissionName })
        .then((r) => {
          if (r.state === 'granted') start();
        })
        .catch(() => {});
    } catch {}
    return () => {
      if (id.current != null) navigator.geolocation.clearWatch(id.current);
    };
  }, [start]);

  return { fix, status, start };
}
