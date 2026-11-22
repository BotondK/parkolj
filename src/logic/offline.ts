// Internet nélküli működés a weben: service worker regisztrálása és az online állapot figyelése.
import { useEffect, useState } from 'react';
import { Platform } from 'react-native';

const web = Platform.OS === 'web' && typeof window !== 'undefined';

export function registerServiceWorker() {
  if (!web || !('serviceWorker' in navigator) || process.env.NODE_ENV !== 'production') return;
  const url = new URL('sw.js', window.location.origin + window.location.pathname.replace(/[^/]*$/, ''));
  navigator.serviceWorker.register(url.href, { scope: url.pathname.replace(/sw\.js$/, '') }).catch(() => null);
}

/** Van-e internet (weben a böngésző jelzése; telefonon egyelőre mindig igaz) */
export function useOnline() {
  const [online, setOnline] = useState(web ? navigator.onLine : true);
  useEffect(() => {
    if (!web) return;
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);
  return online;
}
