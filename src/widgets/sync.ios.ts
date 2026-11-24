// iPhone: a pillanatkép a közös App Group tárba kerül (UserDefaults), onnan olvassa a WidgetKit-widget (targets/widget).
import { ExtensionStorage } from '@bacons/apple-targets';
import { liveEnd, liveSync } from '../../modules/parkolj-live';
import { saveJSON } from '../logic/storage';
import type { WidgetData } from './widgetModel';

export const APP_GROUP = 'group.hu.parkolj.app';
const storage = new ExtensionStorage(APP_GROUP);

export async function syncWidgets(d: WidgetData) {
  await saveJSON('widget', d);
  try {
    storage.set('widget', JSON.stringify(d));
    ExtensionStorage.reloadWidget();
  } catch {
    // Expo Go-ban nincs natív modul: ott nincs widget sem
  }
  // Élő tevékenység (zárolt képernyő, Dynamic Island): aktív parkolásnál indul vagy frissül, utána eltűnik
  if (d.active) await liveSync(JSON.stringify({ ...d.active, labels: d.labels }));
  else await liveEnd();
}
