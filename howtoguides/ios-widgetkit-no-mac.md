# iPhone Widget Setup Without a Mac

This project is now configured to build an iOS WidgetKit extension through EAS cloud prebuild, so you can work from Windows.

## What Is Already Configured

- Plugin installed: react-native-widget-extension
- Expo app config includes plugin settings: widgets folder, app group, deployment target
- Widget Swift files exist in [ios-widgets](../ios-widgets)
- JS payload sync is wired in [services/iosWidgetSyncService.ts](../services/iosWidgetSyncService.ts)
- Home screen updates call iOS widget sync in [app/(tabs)/index.tsx](../app/(tabs)/index.tsx)

## 1. Keep Using EAS For iOS Builds

Run one of:

```bash
pnpm ios:build:store
```

or

```bash
npx -y eas-cli build -p ios --profile production
```

EAS will run prebuild in cloud and generate the widget target from [ios-widgets](../ios-widgets).

## 2. Ensure iOS Credentials Include App Group Support

In Expo/EAS credentials setup, use identifiers that allow app groups.

Expected app group identifier:

- group.com.jmnapp.shared

## 3. Verify Build Includes Extension

After build completes:

1. Install the iOS build on a device.
2. Long-press home screen and add widget.
3. Look for JMN widget entries.

## 4. Validate Data Flow

1. Open the app home tab.
2. Wait for prayer data refresh.
3. Widget should update next prayer and prayer rows.

## 5. Distribution

Submit with your existing command:

```bash
pnpm ios:submit:latest
```

## Notes

- Xcode Cloud web interface cannot create new widget targets by itself.
- This repo now relies on EAS cloud prebuild to create/manage the widget extension.
- If you continue to use Xcode Cloud builds, they must consume source that already contains the generated iOS target files.
