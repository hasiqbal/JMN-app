const { withAndroidManifest } = require('expo/config-plugins');

/**
 * Ensure widget providers remain exported so launcher/system broadcasts can reach them.
 * react-native-android-widget currently writes android:exported="false" by default.
 */
module.exports = function withAndroidWidgetReceiverExported(config) {
  return withAndroidManifest(config, (configWithManifest) => {
    const app = configWithManifest.modResults?.manifest?.application?.[0];
    const receivers = app?.receiver ?? [];

    receivers.forEach((receiver) => {
      const name = receiver?.$?.['android:name'];
      if (!name) return;

      if (name.endsWith('.HomePrayerHeroWidget') || name === '.widget.HomePrayerHeroWidget') {
        receiver.$['android:exported'] = 'true';
      }
    });

    return configWithManifest;
  });
};
