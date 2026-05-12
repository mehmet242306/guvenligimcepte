begin;

update public.paddle_webhook_events
   set payload = jsonb_build_object(
     'event_id', event_id,
     'event_type', event_type,
     'occurred_at', occurred_at,
     'payload_minimized_at', now()
   )
 where payload <> '{}'::jsonb;

comment on table public.paddle_webhook_events is
'Paddle webhook idempotency and operational trace table. Payloads are intentionally minimized/redacted; do not store payment PII here.';

commit;
