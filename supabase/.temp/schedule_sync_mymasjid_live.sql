create extension if not exists pg_cron;
create extension if not exists pg_net;

-- The sync-mymasjid-live function runs an internal polling loop every 5 seconds
-- for 50 seconds per invocation, so a single per-minute cron is sufficient.
-- A distributed lock (live_poll_lock_ts in app_settings) prevents overlapping runs.

-- Remove any previously scheduled jobs.
select cron.unschedule(jobid)
from cron.job
where jobname in (
  'jmn-sync-mymasjid-live-every-minute',
  'jmn-sync-live-00s',
  'jmn-sync-live-30s',
  'jmn-sync-live-every-minute'
);

-- Drop the helper function from the 30-second offset approach if it exists.
drop function if exists public.jmn_call_sync_live_delayed(int);

select cron.schedule(
  'jmn-sync-live-every-minute',
  '*/1 * * * *',
  $$
  select net.http_post(
    url := 'https://lhaqqqatdztuijgdfdcf.functions.supabase.co/sync-mymasjid-live',
    headers := '{"Content-Type":"application/json","Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxoYXFxcWF0ZHp0dWlqZ2RmZGNmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU1OTkxMTksImV4cCI6MjA5MTE3NTExOX0.Z3MV96PflYqwoexwsoi7ma4yAO3og1juWWu9YWviLbU"}'::jsonb,
    body := '{"dryRun":false}'::jsonb
  );
  $$
);
