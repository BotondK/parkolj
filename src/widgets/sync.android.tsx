// Android: pillanatkép mentése (a félórás frissítéshez) és az összes kihelyezett widget azonnali újrarajzolása.
import { requestWidgetUpdate } from 'react-native-android-widget';
import { saveJSON } from '../logic/storage';
import { ANDROID_WIDGETS, renderAndroidWidget } from './android/AndroidWidgets';
import type { WidgetData } from './widgetModel';

export async function syncWidgets(d: WidgetData) {
  await saveJSON('widget', d);
  for (const name of Object.values(ANDROID_WIDGETS)) {
    await requestWidgetUpdate({ widgetName: name, renderWidget: (info) => renderAndroidWidget(name, d, info.width, info.height) }).catch(() => {});
  }
}
