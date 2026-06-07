import { NativeModules, Platform } from 'react-native';
import type { HomePrayerWidgetPayload } from '@/widgets/home-prayer-widget';

type WidgetExtensionModule = {
  setHomePrayerWidgetPayload?: (payloadJson: string) => Promise<void> | void;
  reloadHomePrayerWidget?: () => Promise<void> | void;
  reloadAllWidgets?: () => Promise<void> | void;
};

function getBridge(): WidgetExtensionModule | null {
  if (Platform.OS !== 'ios') {
    return null;
  }

  return (NativeModules.ReactNativeWidgetExtension as WidgetExtensionModule | undefined) ?? null;
}

export async function syncIosHomePrayerWidget(payload: HomePrayerWidgetPayload): Promise<void> {
  const bridge = getBridge();
  if (!bridge) {
    return;
  }

  try {
    if (bridge.setHomePrayerWidgetPayload) {
      await Promise.resolve(bridge.setHomePrayerWidgetPayload(JSON.stringify(payload)));
    }

    if (bridge.reloadHomePrayerWidget) {
      await Promise.resolve(bridge.reloadHomePrayerWidget());
      return;
    }

    if (bridge.reloadAllWidgets) {
      await Promise.resolve(bridge.reloadAllWidgets());
    }
  } catch (error) {
    if (__DEV__) {
      console.warn('[Widget][iOS] Failed to sync home prayer widget payload:', error);
    }
  }
}
