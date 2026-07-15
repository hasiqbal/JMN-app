import type { HomePrayerWidgetPayload } from '@/widgets/home-prayer-widget';

export async function syncIosHomePrayerWidget(_payload: HomePrayerWidgetPayload): Promise<void> {
  // Apple widget support is temporarily disabled for this build.
  return;
}
