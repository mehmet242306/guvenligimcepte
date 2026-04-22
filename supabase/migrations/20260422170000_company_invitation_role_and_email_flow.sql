-- =============================================================================
-- Company invitations: carry role on the invitation + accept uses it
-- =============================================================================
-- Adds invited_role to company_invitations so the inviter's chosen role flows
-- through to the accepted membership. Backfill existing rows to the default
-- ('viewer'). Adjusts accept_company_invitation to read the column.
--
-- New column: invited_role text NOT NULL default 'viewer'
--   constrained to: owner | admin | staff | viewer (extended in a later pass
--   when the 5-role UI adapter lands).
-- =============================================================================

alter table public.company_invitations
  add column if not exists invited_role text;

update public.company_invitations
   set invited_role = 'viewer'
 where invited_role is null;

alter table public.company_invitations
  alter column invited_role set default 'viewer';

alter table public.company_invitations
  alter column invited_role set not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint
     where conname = 'company_invitations_invited_role_check'
       and conrelid = 'public.company_invitations'::regclass
  ) then
    alter table public.company_invitations
      add constraint company_invitations_invited_role_check
      check (invited_role in ('owner', 'admin', 'staff', 'viewer'));
  end if;
end $$;

-- Replace accept_company_invitation to honor invited_role when creating the
-- company_memberships row. All other behavior is unchanged.
create or replace function public.accept_company_invitation(
  p_invitation_id uuid,
  p_note text default null
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invitation public.company_invitations%rowtype;
  v_membership_id uuid;
  v_existing_membership_id uuid;
  v_target_role text;
begin
  select *
    into v_invitation
    from public.company_invitations ci
   where ci.id = p_invitation_id
   for update;

  if not found then
    raise exception 'invitation not found';
  end if;

  if v_invitation.status <> 'pending' then
    raise exception 'invitation is not pending';
  end if;

  if v_invitation.expires_at is not null and v_invitation.expires_at < now() then
    update public.company_invitations
       set status = 'expired'
     where id = p_invitation_id;
    raise exception 'invitation expired';
  end if;

  if auth.uid() is null then
    raise exception 'auth context required';
  end if;

  if v_invitation.invitee_user_id is null then
    if public.current_user_email() is null
       or v_invitation.invitee_email <> public.current_user_email() then
      raise exception 'invitation email does not match current user';
    end if;

    update public.company_invitations
       set invitee_user_id = auth.uid()
     where id = p_invitation_id;
    v_invitation.invitee_user_id := auth.uid();
  end if;

  if v_invitation.invitee_user_id <> auth.uid() then
    raise exception 'invitation does not belong to current user';
  end if;

  v_target_role := coalesce(v_invitation.invited_role, 'viewer');

  select cm.id
    into v_existing_membership_id
    from public.company_memberships cm
   where cm.company_identity_id = v_invitation.company_identity_id
     and cm.user_id = auth.uid()
   order by cm.created_at asc
   limit 1;

  if v_existing_membership_id is null then
    insert into public.company_memberships (
      company_identity_id,
      company_workspace_id,
      organization_id,
      user_id,
      membership_role,
      employment_type,
      status,
      can_approve_join_requests,
      is_primary_contact,
      approved_at,
      approved_by_user_id,
      notes
    ) values (
      v_invitation.company_identity_id,
      v_invitation.company_workspace_id,
      public.current_user_organization_id(),
      auth.uid(),
      v_target_role,
      'external',
      'active',
      false,
      false,
      now(),
      v_invitation.inviter_user_id,
      p_note
    )
    returning id into v_membership_id;
  else
    update public.company_memberships
       set status = 'active',
           membership_role = v_target_role,
           approved_at = coalesce(approved_at, now()),
           approved_by_user_id = coalesce(approved_by_user_id, v_invitation.inviter_user_id),
           notes = coalesce(notes, p_note)
     where id = v_existing_membership_id
    returning id into v_membership_id;
  end if;

  perform public.apply_member_module_permissions_from_invitation(
    p_invitation_id,
    v_membership_id
  );

  update public.company_invitations
     set status = 'accepted',
         accepted_at = now(),
         accepted_by_user_id = auth.uid()
   where id = p_invitation_id;

  return v_membership_id;
end;
$$;
