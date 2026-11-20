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
