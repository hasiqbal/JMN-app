const prayerRefreshListeners = new Set<() => void>();

export function subscribePrayerNotificationRefresh(listener: () => void): () => void {
  prayerRefreshListeners.add(listener);
  return () => {
    prayerRefreshListeners.delete(listener);
  };
}

export function requestPrayerNotificationRefresh(): void {
  for (const listener of prayerRefreshListeners) {
    try {
      listener();
    } catch {
      // Keep notifications flow resilient if one listener fails.
    }
  }
}
