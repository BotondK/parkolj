import { registerWidgetTaskHandler } from 'react-native-android-widget';
import { widgetTaskHandler } from './android/widgetTask';

export function registerWidgets() {
  registerWidgetTaskHandler(widgetTaskHandler);
}
