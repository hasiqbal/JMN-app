type TabBarVisibilityListener = (hidden: boolean) => void;

let tabBarHidden = false;
const listeners = new Set<TabBarVisibilityListener>();

export function setTabBarHidden(hidden: boolean): void {
  if (tabBarHidden === hidden) return;
  tabBarHidden = hidden;
  listeners.forEach((listener) => {
    listener(tabBarHidden);
  });
}

export function subscribeTabBarHidden(listener: TabBarVisibilityListener): () => void {
  listeners.add(listener);
  listener(tabBarHidden);
  return () => {
    listeners.delete(listener);
  };
}
