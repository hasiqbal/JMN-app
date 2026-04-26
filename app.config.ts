import appJson from './app.json';

const base = appJson.expo;

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
