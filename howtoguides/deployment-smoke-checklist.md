# Deployment Smoke Checklist

Use this checklist before any deployment build.

## 1. Quality Gates

Run these in order from the project root:

```bash
pnpm validate
pnpm validate:deploy
```

Expected outcome:
- Lint passes.
- TypeScript check passes.
- Web bundle sanity build completes without runtime entry errors.

## 2. App Launch and Navigation

Verify on a development build or simulator:
- App launches without red screen.
- Tabs open correctly: Home, Stream, Prayer, Duas, How To, Settings.
- No startup loop or route redirect issues.

## 3. Core User Flows

Verify these flows end-to-end:
- Home loads prayer summary and hero section.
- Stream opens and playback controls respond.
- Duas list opens and detail view renders.
- How To guides load and open detail content.
- Prayer screen loads today rows and timeline summary.

## 4. Notification and Background Checks

Verify key behavior:
- Notification permissions prompt behaves as expected.
- Prayer reminder settings save and persist after restart.
- Adhkar reminder settings save and persist after restart.
- No duplicate channel warnings in logs after opening app.

## 5. Deployment Readiness Checks

Before running EAS build:
- Confirm target profile in eas.json is correct.
- Confirm Windows folder attributes are not read-only for project source directories.
- Confirm required secrets and function dependencies are already configured in Supabase.

## 6. Signoff

Record in release notes:
- Date and tester name.
- Device or emulator used.
- Any known non-blocking issues.
- Final status: PASS or FAIL.
