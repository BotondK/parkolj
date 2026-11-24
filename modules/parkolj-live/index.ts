// Élő tevékenység (iPhone, iOS 16.2+). Ahol nincs natív modul (web, Android, Expo Go), minden hívás csendben semmit nem csinál.
import { requireOptionalNativeModule } from 'expo';

type Native = { isSupported(): boolean; sync(json: string): Promise<void>; end(): Promise<void> };
const native = requireOptionalNativeModule<Native>('ParkoljLive');

export const liveSupported = () => !!native && native.isSupported();
export const liveSync = (json: string) => native?.sync(json).catch(() => {}) ?? Promise.resolve();
export const liveEnd = () => native?.end().catch(() => {}) ?? Promise.resolve();
