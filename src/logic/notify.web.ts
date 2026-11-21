// Webes értesítés: böngésző Notification API, ha engedélyezett. Az appon belüli sáv mindig megjelenik.
export async function requestNotify() {
  try {
    if ('Notification' in window && Notification.permission === 'default') await Notification.requestPermission();
  } catch {}
}

export async function alertUser(title: string, body: string) {
  try {
    if ('Notification' in window && Notification.permission === 'granted') new Notification(title, { body });
  } catch {}
}

// Weben nincs háttérbeli ütemezés push szerver nélkül; az appon belüli sáv és a böngészőértesítés szól, amíg nyitva van.
export async function scheduleExpiry(_endAt: number, _soon: string, _expired: string, _title: string, _soonMin?: number) {}
export async function cancelExpiry() {}
export const SCHEDULES_IN_BACKGROUND = false;
