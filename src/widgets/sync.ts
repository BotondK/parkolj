// Web és alapértelmezés: nincs kezdőképernyő-widget, csak a pillanatkép mentődik (a Menü → Widgetek előnézethez).
import { saveJSON } from '../logic/storage';
import type { WidgetData } from './widgetModel';

export async function syncWidgets(d: WidgetData) {
  await saveJSON('widget', d);
}
