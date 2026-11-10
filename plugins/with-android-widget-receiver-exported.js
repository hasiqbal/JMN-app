const { withAndroidManifest } = require('expo/config-plugins');

/**
 * Ensure widget providers remain exported so launcher/system broadcasts can reach them.
 * react-native-android-widget currently writes android:exported="false" by default.
 */
module.exports = function withAndroidWidgetReceiverExported(config) {
  return withAndroidManifest(config, (configWithManifest) => {
    const app = configWithManifest.modResults?.manifest?.application?.[0];
    const receivers = app?.receiver ?? [];
    const refreshActions = [
      'android.intent.action.DATE_CHANGED',
      'android.intent.action.TIME_SET',
      'android.intent.action.TIMEZONE_CHANGED',
      'android.intent.action.BOOT_COMPLETED',
    ];

    receivers.forEach((receiver) => {
      const name = receiver?.$?.['android:name'];
      if (!name) return;

      if (name.endsWith('.HomePrayerHeroWidget') || name === '.widget.HomePrayerHeroWidget') {
        receiver.$['android:exported'] = 'true';
        const filters = receiver['intent-filter'] ?? [];
        let widgetFilter = filters.find((filter) =>
          filter.action?.some((action) => action.$?.['android:name'] === 'android.appwidget.action.APPWIDGET_UPDATE'),
        );
        if (!widgetFilter) {
          widgetFilter = { action: [] };
          filters.push(widgetFilter);
        }

        refreshActions.forEach((actionName) => {
          const exists = filters.some((filter) =>
            filter.action?.some((action) => action.$?.['android:name'] === actionName),
          );
          if (!exists) {
            widgetFilter.action.push({ $: { 'android:name': actionName } });
          }
        });

        receiver['intent-filter'] = filters;
      }
    });

    return configWithManifest;
  });
};
