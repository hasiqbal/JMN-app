const androidWidgetConfig = {
  widgets: [
    {
      name: 'HomePrayerHeroWidget',
      label: 'JMN Prayer Times',
      minWidth: '280dp',
      minHeight: '200dp',
      targetCellWidth: 4,
      targetCellHeight: 3,
      description: "Jami' Masjid Noorani hero widget with today's prayer times.",
      previewImage: './assets/widget-preview/home-prayer-hero-widget-sky-subtle.png',
      resizeMode: 'horizontal|vertical',
      updatePeriodMillis: 1800000,
    },
  ],
};

const base = {
  name: 'JMN',
  slug: 'jmn',
  version: '5.0',
  orientation: 'portrait',
  icon: './assets/images/favicon.png',
  scheme: 'jmn',
  userInterfaceStyle: 'light',
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.hasiqbal.jmn',
    buildNumber: '5',
    infoPlist: {
      ITSAppUsesNonExemptEncryption: false,
    },
  },
  android: {
    adaptiveIcon: {
      foregroundImage: './assets/images/favicon.png',
      backgroundColor: '#ffffff',
    },
    googleServicesFile: './google-services.json',
    permissions: [
      'android.permission.VIBRATE',
      'android.permission.RECEIVE_BOOT_COMPLETED',
      'android.permission.SCHEDULE_EXACT_ALARM',
      'android.permission.USE_EXACT_ALARM',
    ],
    // Keep Play-sensitive permissions blocked unless explicitly needed.
    blockedPermissions: [
      'android.permission.CAMERA',
      'android.permission.RECORD_AUDIO',
      'android.permission.ACCESS_COARSE_LOCATION',
      'android.permission.ACCESS_FINE_LOCATION',
      'android.permission.READ_CONTACTS',
      'android.permission.WRITE_CONTACTS',
      'android.permission.READ_CALENDAR',
      'android.permission.WRITE_CALENDAR',
      'android.permission.READ_EXTERNAL_STORAGE',
      'android.permission.WRITE_EXTERNAL_STORAGE',
      'android.permission.READ_MEDIA_AUDIO',
      'android.permission.READ_MEDIA_IMAGES',
      'android.permission.READ_MEDIA_VIDEO',
      'android.permission.READ_MEDIA_VISUAL_USER_SELECTED',
      'android.permission.SYSTEM_ALERT_WINDOW',
      'android.permission.USE_BIOMETRIC',
      'android.permission.USE_FINGERPRINT',
      'android.permission.ACTIVITY_RECOGNITION',
      'android.permission.BODY_SENSORS',
      'android.permission.BODY_SENSORS_BACKGROUND',
      'android.permission.FOREGROUND_SERVICE',
      'android.permission.FOREGROUND_SERVICE_MEDIA_PLAYBACK',
    ],
    package: 'com.jmnapp',
  },
  web: {
    bundler: 'metro',
    output: 'static',
    favicon: './assets/images/favicon.png',
  },
  plugins: [
    'expo-router',
    ['react-native-android-widget', androidWidgetConfig],
    [
      'expo-notifications',
      {
        sounds: [
          './assets/audio/adhaan_1_v2.mp3',
          './assets/audio/adhaan_2_v2.mp3',
          './assets/audio/adhaan_3_v2.mp3',
          './assets/audio/iqamah_new.mp3',
        ],
      },
    ],
    [
      'expo-splash-screen',
      {
        image: './assets/images/favicon.png',
        imageWidth: 200,
        resizeMode: 'contain',
        backgroundColor: '#ffffff',
      },
    ],
    'expo-web-browser',
    '@react-native-community/datetimepicker',
    'expo-asset',
    'expo-font',
    'expo-audio',
    'expo-localization',
    'expo-mail-composer',
    'expo-secure-store',
    'expo-sqlite',
    'expo-video',
  ],
  experiments: {
    typedRoutes: true,
  },
  extra: {
    router: {},
    eas: {
      projectId: '699b7ea2-af04-453c-96ed-f2bb121ab43b',
    },
  },
};

const androidGoogleServicesFile =
  process.env.GOOGLE_SERVICES_JSON ||
  process.env.EXPO_ANDROID_GOOGLE_SERVICES_JSON ||
  base.android?.googleServicesFile;

const iosGoogleServicesFile =
  process.env.GOOGLE_SERVICES_INFO_PLIST ||
  process.env.EXPO_IOS_GOOGLE_SERVICES_INFO_PLIST ||
  undefined;

export default {
  expo: {
    ...base,
    android: {
      ...base.android,
      googleServicesFile: androidGoogleServicesFile,
    },
    ios: {
      ...base.ios,
      ...(iosGoogleServicesFile ? { googleServicesFile: iosGoogleServicesFile } : {}),
    },
  },
};
