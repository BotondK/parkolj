import * as Notifications from 'expo-notifications';

// Natív helyi értesítések (Expo Go-ban is működik). Webes változat: notify.web.ts

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function requestNotify() {
  try {
    await Notifications.requestPermissionsAsync();
  } catch {}
}

export async function alertUser(title: string, body: string) {
  try {
    await Notifications.scheduleNotificationAsync({ content: { title, body }, trigger: null });
  } catch {}
}

/**
 * Lejárati értesítések előre ütemezése, így akkor is szól, ha az app be van zárva:
 * a beállított perccel (alapból 10) a lejárat előtt és lejáratkor. Az előző ütemezést mindig törli.
 */
export async function scheduleExpiry(endAt: number, soon: string, expired: string, title: string, soonMin = 10) {
  await cancelExpiry();
  const now = Date.now();
  const plan: [number, string][] = [
    [endAt - soonMin * 60000, soon],
    [endAt, expired],
  ];
  for (const [at, body] of plan) {
    if (at <= now + 5000) continue;
    try {
      await Notifications.scheduleNotificationAsync({
        content: { title, body, data: { kind: 'expiry' } },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: new Date(at) },
      });
    } catch {}
  }
}

export async function cancelExpiry() {
  try {
    const all = await Notifications.getAllScheduledNotificationsAsync();
    await Promise.all(
      all
        .filter((n) => (n.content.data as { kind?: string } | undefined)?.kind === 'expiry')
        .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)),
    );
  } catch {}
}

/** Telefonon az ütemezett értesítés szól, így az appon belüli azonnali értesítés felesleges. */
export const SCHEDULES_IN_BACKGROUND = true;
