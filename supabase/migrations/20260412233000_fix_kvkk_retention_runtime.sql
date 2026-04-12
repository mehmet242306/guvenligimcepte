create or replace function public.run_retention_policies()
returns table (
  entity_type text,
  action text,
  affected_count integer,
  status text,
  details jsonb
)
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_policy public.retention_policies;
  v_request public.data_deletion_requests;
  v_count integer := 0;
  v_details jsonb := '{}'::jsonb;
begin
  if auth.uid() is not null and not (
    public.user_has_permission('settings.manage')
    or public.user_has_permission('compliance.kvkk.manage')
  ) then
    raise exception 'Bu islem icin yetkiniz yok.';
  end if;

  for v_policy in
    select *
    from public.retention_policies
    where is_active = true
    order by entity_type
  loop
    v_count := 0;
    v_details := '{}'::jsonb;

    begin
      if v_policy.entity_type = 'user_account' then
        for v_request in
          select *
          from public.data_deletion_requests
          where status = 'scheduled'
            and scheduled_purge_at <= now()
          order by scheduled_purge_at
        loop
          update public.data_deletion_requests
          set status = 'processing',
              processed_at = now(),
              updated_at = now()
          where id = v_request.id;

          begin
            delete from public.data_exports
            where target_user_id = v_request.target_user_id
               or requested_by = v_request.target_user_id;

            delete from auth.users
            where id = v_request.target_user_id;

            update public.data_deletion_requests
            set status = 'completed',
                completed_at = now(),
                error_message = null,
                updated_at = now()
            where id = v_request.id;

            perform public.log_security_event(
              p_event_type => 'privacy.deletion_completed',
              p_severity => 'critical',
              p_endpoint => '/cron/kvkk-retention',
              p_user_id => v_request.target_user_id,
              p_organization_id => v_request.organization_id,
              p_details => jsonb_build_object(
                'request_id', v_request.id,
                'scheduled_purge_at', v_request.scheduled_purge_at
              )
            );

            v_count := v_count + 1;
          exception
            when others then
              update public.data_deletion_requests
              set status = 'scheduled',
                  error_message = left(sqlerrm, 400),
                  updated_at = now()
              where id = v_request.id;
          end;
        end loop;
      elsif v_policy.entity_type = 'data_exports' then
        if v_policy.action = 'delete' then
          delete from public.data_exports
          where status in ('completed', 'failed', 'expired')
            and coalesce(completed_at, requested_at) <= now() - make_interval(days => v_policy.retention_days);
          get diagnostics v_count = row_count;
        elsif v_policy.action = 'anonymize' then
          update public.data_exports
          set
            payload_json = null,
            payload_csv = null,
            status = 'expired',
            updated_at = now()
          where coalesce(completed_at, requested_at) <= now() - make_interval(days => v_policy.retention_days)
            and (payload_json is not null or payload_csv is not null);
          get diagnostics v_count = row_count;
        else
          v_details := jsonb_build_object('warning', 'unsupported_action');
        end if;
      else
        v_details := jsonb_build_object('warning', 'unsupported_entity_type');
      end if;

      insert into public.retention_executions (
        policy_id,
        entity_type,
        action,
        status,
        affected_count,
        details,
        executed_at
      )
      values (
        v_policy.id,
        v_policy.entity_type,
        v_policy.action,
        case
          when v_details ? 'warning' then 'skipped'
          else 'completed'
        end,
        v_count,
        coalesce(v_details, '{}'::jsonb),
        now()
      );

      entity_type := v_policy.entity_type;
      action := v_policy.action;
      affected_count := v_count;
      status := case
        when v_details ? 'warning' then 'skipped'
        else 'completed'
      end;
      details := coalesce(v_details, '{}'::jsonb);
      return next;
    exception
      when others then
        v_details := jsonb_build_object(
          'error', left(sqlerrm, 400),
          'policy_id', v_policy.id,
          'entity_type', v_policy.entity_type
        );

        insert into public.retention_executions (
          policy_id,
          entity_type,
          action,
          status,
          affected_count,
          details,
          executed_at
        )
        values (
          v_policy.id,
          v_policy.entity_type,
          v_policy.action,
          'failed',
          0,
          v_details,
          now()
        );

        entity_type := v_policy.entity_type;
        action := v_policy.action;
        affected_count := 0;
        status := 'failed';
        details := v_details;
        return next;
    end;
  end loop;
end;
$$;
