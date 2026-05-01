import AsyncStorage from '@react-native-async-storage/async-storage';
import { ADHKAR_NOTIFICATION_SCOPE } from '@/constants/prayerNotifications';

type PersistedPushMessage = {
  notificationId: string;
  title: string;
  body: string;
  urduTitle?: string;
  urduBody?: string;
  category?: string;
  audience?: string;
  imageUrl?: string;
  linkUrl?: string;
  receivedAt: string;
};

type NotificationContent = {
  title?: string | null;
  body?: string | null;
};

type RouteFromPushNotificationArgs = {
  rawData: unknown;
  content?: NotificationContent;
  push: (target: unknown) => void;
  openLiveStreamFromIntent: () => void;
  pushMessageStorageKey: string;
};

function readDataString(data: Record<string, unknown> | null, key: string): string {
  const value = data?.[key];
  if (typeof value !== 'string') return '';
  return value.trim();
}

function parseNotificationData(rawData: unknown): Record<string, unknown> | null {
  if (rawData && typeof rawData === 'object') {
    return rawData as Record<string, unknown>;
  }

  if (typeof rawData === 'string') {
    try {
      const parsed = JSON.parse(rawData) as unknown;
      if (parsed && typeof parsed === 'object') {
        return parsed as Record<string, unknown>;
      }
    } catch {
      return null;
    }
  }

  return null;
}

async function persistPushMessage(args: {
  rawData: unknown;
  contentTitle?: string | null;
  contentBody?: string | null;
  pushMessageStorageKey: string;
}): Promise<{ notificationId: string; hasPushMessage: boolean; data: Record<string, unknown> | null }> {
  const data = parseNotificationData(args.rawData);
  const notificationId = readDataString(data, 'notificationId');
  if (!notificationId) {
    return { notificationId: '', hasPushMessage: false, data };
  }

  const englishTitle = readDataString(data, 'title') || (args.contentTitle ?? '').trim();
  const englishBody = readDataString(data, 'body') || (args.contentBody ?? '').trim();
  if (!englishTitle && !englishBody) {
    return { notificationId, hasPushMessage: false, data };
  }

  const payload: PersistedPushMessage = {
    notificationId,
    title: englishTitle,
    body: englishBody,
    urduTitle: readDataString(data, 'urduTitle'),
    urduBody: readDataString(data, 'urduBody'),
    category: readDataString(data, 'category'),
    audience: readDataString(data, 'audience'),
    imageUrl: readDataString(data, 'imageUrl'),
    linkUrl: readDataString(data, 'url') || readDataString(data, 'linkUrl'),
    receivedAt: new Date().toISOString(),
  };

  await AsyncStorage.setItem(args.pushMessageStorageKey, JSON.stringify(payload)).catch(() => {});
  return { notificationId, hasPushMessage: true, data };
}

export async function routeFromPushNotificationData(args: RouteFromPushNotificationArgs): Promise<void> {
  const data = parseNotificationData(args.rawData);
  if (!data) return;

  const routeRaw = typeof data.route === 'string' ? data.route.trim() : null;
  const persisted = await persistPushMessage({
    rawData: args.rawData,
    contentTitle: args.content?.title,
    contentBody: args.content?.body,
    pushMessageStorageKey: args.pushMessageStorageKey,
  });

  if (routeRaw === '/push-notification' || (!routeRaw && persisted.notificationId && persisted.hasPushMessage)) {
    args.push({
      pathname: '/push-notification',
      params: { notificationId: persisted.notificationId, openedAt: String(Date.now()) },
    });
    return;
  }

  if (!routeRaw) return;
  const route = routeRaw.startsWith('/') ? routeRaw : `/${routeRaw}`;

  const type = typeof data.type === 'string' ? data.type : null;
  const shouldAutoplayLive = route === '/stream' && type === 'jmn-live';

  if (shouldAutoplayLive) {
    args.openLiveStreamFromIntent();
    return;
  }

  if (route === '/duas' && data.scope === ADHKAR_NOTIFICATION_SCOPE) {
    const prayerTime = typeof data.prayerTime === 'string' ? data.prayerTime.trim() : '';
    if (prayerTime) {
      args.push({
        pathname: '/duas',
        params: {
          prayerTime,
          openAt: String(Date.now()),
        },
      });
      return;
    }
  }

  args.push(route);
}
