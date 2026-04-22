-- =============================================================================
-- preview_company_invitation RPC
-- =============================================================================
-- Powers the public /invite/[id] landing page. Returns minimal invitation
-- details without requiring authentication, so the invitee can see what they
-- are being invited to before logging in / registering.
--
-- Executes as security definer. Grants execute to anon + authenticated.
-- Only exposes non-sensitive fields: company name, inviter display name,
-- status, expiry, invitee email (needed to guide the user to the right
-- account), and the invite message.
-- =============================================================================

create or replace function public.preview_company_invitation(p_invitation_id uuid)
returns table (
  id uuid,
  status text,
  company_identity_id uuid,
  company_name text,
  inviter_full_name text,
  invitee_email text,
  expires_at timestamptz,
  message text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    ci.id,
    ci.status,
    ci.company_identity_id,
    coalesce(cwi.display_name, cid.official_name) as company_name,
    inviter.full_name as inviter_full_name,
    ci.invitee_email::text as invitee_email,
    ci.expires_at,
    ci.message
  from public.company_invitations ci
  left join public.company_identities cid on cid.id = ci.company_identity_id
  left join public.company_workspaces cwi on cwi.id = ci.company_workspace_id
  left join public.user_profiles inviter on inviter.auth_user_id = ci.inviter_user_id
  where ci.id = p_invitation_id
  limit 1
$$;

revoke all on function public.preview_company_invitation(uuid) from public;
grant execute on function public.preview_company_invitation(uuid) to anon, authenticated, service_role;
