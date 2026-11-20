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
