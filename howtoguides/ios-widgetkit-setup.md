# iOS WidgetKit Setup (Home Prayer Widget)

This guide enables an iPhone home screen widget that reads prayer data from the app.

## What Is Already In Place

- JS/TS side writes widget payload and calls an iOS bridge hook: [services/iosWidgetSyncService.ts](../services/iosWidgetSyncService.ts)
- Home tab now calls iOS widget sync when prayer data updates: [app/(tabs)/index.tsx](../app/(tabs)/index.tsx)
- App config includes widget metadata in `expo.extra.widget`:
  - `iosAppGroup`: `group.com.jmnapp.shared`
  - `iosKind`: `HomePrayerHeroWidget`

## 1. Generate/refresh native iOS project

From project root:

```bash
pnpm expo prebuild --platform ios
```

If `ios/` already exists, commit or stash local changes before re-running prebuild.

## 2. Create Widget Extension target in Xcode

1. Open `ios/JMN.xcworkspace` in Xcode.
2. File > New > Target > Widget Extension.
3. Name it `JMNHomePrayerWidgetExtension`.
4. Keep SwiftUI + WidgetKit defaults.

## 3. Add App Group capability to both targets

In Signing & Capabilities:

1. Main app target: add App Groups, include `group.com.jmnapp.shared`.
2. Widget extension target: add App Groups, include `group.com.jmnapp.shared`.

App group value must match `expo.extra.widget.iosAppGroup` in app config.

## 4. Add native bridge module in app target

Create Swift module `JmnWidgetBridge` in main app target:

- `setHomePrayerWidgetPayload(_ payloadJson: String)`
  - Write payload into `UserDefaults(suiteName: "group.com.jmnapp.shared")`
  - Suggested key: `jmn.widget.homePrayer.payload`
- `reloadHomePrayerWidget()`
  - Call `WidgetCenter.shared.reloadTimelines(ofKind: "HomePrayerHeroWidget")`

Optional fallback method:

- `reloadAllWidgets()`
  - Call `WidgetCenter.shared.reloadAllTimelines()`

This bridge name and method names are expected by [services/iosWidgetSyncService.ts](../services/iosWidgetSyncService.ts).

## 5. Read payload in WidgetKit timeline provider

In widget extension target:

1. Read JSON from shared UserDefaults key `jmn.widget.homePrayer.payload`.
2. Decode into a Swift struct mirroring TS payload fields:
   - `dateLine`
   - `hijriLine`
   - `nextPrayerLine`
   - `nextPrayerName`
   - `nextPrayerTime`
   - `prayers` (name/time/iqamah)
   - `updatedAtIso`
3. Render small/medium layouts with SwiftUI.

## 6. Test update flow

1. Run app on iPhone/simulator.
2. Add widget to home screen.
3. Open app home tab and wait for prayer data fetch.
4. Confirm widget updates after app refresh.

## Notes

- Expo Go cannot host native WidgetKit targets; use dev build or EAS build.
- If widget does not update, verify App Group and widget `kind` match exactly.
