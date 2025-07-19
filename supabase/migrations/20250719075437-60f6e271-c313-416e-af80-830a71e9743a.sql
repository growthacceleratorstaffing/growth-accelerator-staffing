-- Enable required extensions for cron jobs
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Create a cron job to automatically sync JazzHR data every 30 minutes
SELECT cron.schedule(
  'jazzhr-auto-sync',
  '*/30 * * * *', -- Every 30 minutes
  $$
  SELECT
    net.http_post(
        url:='https://doulsumepjfihqowzheq.supabase.co/functions/v1/jazzhr-api',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRvdWxzdW1lcGpmaWhxb3d6aGVxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg4Nzk3ODgsImV4cCI6MjA2NDQ1NTc4OH0.IewqiemFwcu74Y8Gla-XJUMiQp-ym8J-i0niylIVK2A"}'::jsonb,
        body:='{"action": "getJobs", "params": {}}'::jsonb
    ) as request_id;
  $$
);

-- Also create a function to manually trigger sync if needed
CREATE OR REPLACE FUNCTION trigger_jazzhr_sync()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- This function can be called to manually trigger a sync
  PERFORM net.http_post(
    url := 'https://doulsumepjfihqowzheq.supabase.co/functions/v1/jazzhr-api',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRvdWxzdW1lcGpmaWhxb3d6aGVxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg4Nzk3ODgsImV4cCI6MjA2NDQ1NTc4OH0.IewqiemFwcu74Y8Gla-XJUMiQp-ym8J-i0niylIVK2A"}'::jsonb,
    body := '{"action": "getJobs", "params": {}}'::jsonb
  );
END;
$$;