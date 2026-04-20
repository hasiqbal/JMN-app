# JMN

JMN is a masjid app built with React Native and Expo. It provides prayer times, duas, announcements, and radio features in a mobile-friendly interface.

## Features

- Daily prayer times and timetable views
- Duas and adhkar sections
- Masjid announcements and events
- Live stream and radio access
- Expo Router based navigation

## Setup

Node.js 22 LTS is required for this project. Node 25 causes Expo CLI startup failures in this repo.

### 1. Install dependencies

```bash
pnpm install
```

If you do not use pnpm, you can use npm instead:

```bash
npm install
```

### 2. Start the app

```bash
pnpm start
```

If your Node version is wrong, the start command will stop early with a clear error.

Platform shortcuts:

```bash
pnpm android
pnpm ios
pnpm web
```

### 3. Lint the project

```bash
pnpm lint
```

### 4. Reset local project state if needed

```bash
pnpm reset-project
```

## Tech Stack

- Expo
- React Native
- TypeScript
- Expo Router
- Supabase

## Stripe Donation Setup (In-App)

The Donate card now opens Stripe Checkout inside the app using a Supabase Edge Function.

### 1. Deploy the function

```bash
supabase functions deploy create-donation-checkout
```

### 2. Set required function secrets

Use one of these options:

- Option A (recommended): set a Stripe Payment Link URL only
- Option B: set Stripe secret key + Stripe price ID to create a new Checkout Session per tap

```bash
# Option A
supabase secrets set STRIPE_DONATION_PAYMENT_LINK="https://buy.stripe.com/your_link"

# Option B
supabase secrets set STRIPE_SECRET_KEY="sk_live_..."
supabase secrets set STRIPE_DONATION_PRICE_ID="price_..."
```

Optional redirect URLs (used for Option B):

```bash
supabase secrets set STRIPE_SUCCESS_URL="https://jmnhalifax.org.uk/"
supabase secrets set STRIPE_CANCEL_URL="https://jmnhalifax.org.uk/"
```

## Live Status Auto Sync (MyMasjid)

This project includes a Supabase Edge Function that:

- checks the MyMasjid live page
- updates `app_settings.is_live`
- sends push notifications on offline -> live transitions

### 1. Deploy the function

```bash
supabase functions deploy sync-mymasjid-live
```

### 2. Configure optional secrets

```bash
supabase secrets set MYMASJID_LIVE_PAGE_URL="https://mymasjid.uk/live/jamimasjidnoorani"
supabase secrets set MYMASJID_OFFLINE_MARKER="THIS MASJID IS OFFLINE"
supabase secrets set LIVE_NOTIFY_COOLDOWN_MINUTES="15"
```

### 3. Run a dry run check (manual)

```bash
curl -X POST "https://<project-ref>.functions.supabase.co/sync-mymasjid-live" \
	-H "Authorization: Bearer <anon-or-service-role-key>" \
	-H "Content-Type: application/json" \
	-d '{"dryRun": true}'
```

### 4. Schedule it with pg_cron (recommended)

Run this in the Supabase SQL editor:

```sql
select cron.schedule(
	'jmn-sync-mymasjid-live-every-minute',
	'*/1 * * * *',
	$$
	select
		net.http_post(
			url := 'https://<project-ref>.functions.supabase.co/sync-mymasjid-live',
			headers := '{"Content-Type":"application/json","Authorization":"Bearer <anon-or-service-role-key>"}'::jsonb,
			body := '{"dryRun":false}'::jsonb
		);
	$$
);
```

To remove the schedule later:

```sql
select cron.unschedule('jmn-sync-mymasjid-live-every-minute');
```

## Notes

- This project is configured as a private application.
- App configuration is defined in `app.json`.
- Package metadata and scripts are defined in `package.json`.
