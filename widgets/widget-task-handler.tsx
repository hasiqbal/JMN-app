import type { WidgetTaskHandlerProps } from 'react-native-android-widget';
import {
  HOME_PRAYER_WIDGET_NAME,
  renderHomePrayerWidgetFromStorage,
} from './home-prayer-widget';

export async function widgetTaskHandler(props: WidgetTaskHandlerProps): Promise<void> {
  if (props.widgetInfo.widgetName !== HOME_PRAYER_WIDGET_NAME) {
    return;
  }

  switch (props.widgetAction) {
    case 'WIDGET_ADDED':
    case 'WIDGET_UPDATE':
    case 'WIDGET_RESIZED':
    case 'WIDGET_CLICK':
      await renderHomePrayerWidgetFromStorage(props);
      break;

    case 'WIDGET_DELETED':
    default:
      break;
  }
}
