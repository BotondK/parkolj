// Android: a rendszer ezt hívja, amikor a widget felkerül, átméreteződik vagy félóránként frissül (az app ilyenkor nem fut).
// A legutóbb elmentett pillanatképből rajzol; a gombok mélylinkkel nyitják az appot, így itt nincs kattintáskezelés.
import type { WidgetTaskHandlerProps } from 'react-native-android-widget';
import { loadJSON } from '../../logic/storage';
import { buildWidgetData, type WidgetData } from '../widgetModel';
import { renderAndroidWidget } from './AndroidWidgets';

export async function widgetTaskHandler({ widgetInfo, widgetAction, renderWidget }: WidgetTaskHandlerProps) {
  if (widgetAction === 'WIDGET_DELETED' || widgetAction === 'WIDGET_CLICK') return;
  const d = await loadJSON<WidgetData | null>('widget', null);
  const data = d?.v === 1 ? d : buildWidgetData({ lang: 'hu', session: null, favorites: [], now: Date.now() });
  renderWidget(renderAndroidWidget(widgetInfo.widgetName, data, widgetInfo.width, widgetInfo.height));
}
