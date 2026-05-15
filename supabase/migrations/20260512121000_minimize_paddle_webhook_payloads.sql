begin;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'paddle_webhook_events'
      and column_name = 'occurred_at'
  ) then
    update public.paddle_webhook_events
       set payload = jsonb_build_object(
         'event_id', event_id,
         'event_type', event_type,
         'occurred_at', occurred_at,
         'payload_minimized_at', now()
       )
     where payload <> '{}'::jsonb;
  elsif exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'paddle_webhook_events'
      and column_name = 'created_at'
  ) then
    update public.paddle_webhook_events
       set payload = jsonb_build_object(
         'event_id', event_id,
         'event_type', event_type,
         'occurred_at', created_at,
         'payload_minimized_at', now()
       )
     where payload is not null
       and payload <> '{}'::jsonb;
  end if;
end $$;

comment on table public.paddle_webhook_events is
'Paddle webhook idempotency and operational trace table. Payloads are intentionally minimized/redacted; do not store payment PII here.';

commit;
