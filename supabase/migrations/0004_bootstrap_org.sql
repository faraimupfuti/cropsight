-- =============================================================================
-- CropSight — organization bootstrap
-- Lets a newly-signed-up user create their organization and become its
-- first admin in one atomic call, without needing an existing profile/org
-- to satisfy the RLS policies on those tables. SECURITY DEFINER is required
-- here specifically because the caller has no profile yet.
-- =============================================================================

create or replace function bootstrap_organization(
  org_name  text,
  full_name text,
  as_role   user_role default 'company_admin'
)
returns profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org_id uuid;
  v_profile profiles;
begin
  if auth.uid() is null then
    raise exception 'Must be authenticated to bootstrap an organization';
  end if;

  if exists (select 1 from profiles where id = auth.uid()) then
    raise exception 'This account already belongs to an organization';
  end if;

  if as_role not in ('company_admin', 'farmer') then
    raise exception 'Self-serve signup can only create a company_admin or farmer account. Agronomist, researcher and platform_admin accounts must be provisioned by an existing admin.';
  end if;

  insert into organizations (name) values (org_name) returning id into v_org_id;

  insert into profiles (id, organization_id, full_name, role)
  values (auth.uid(), v_org_id, full_name, as_role)
  returning * into v_profile;

  insert into outbreak_thresholds (organization_id) values (v_org_id);

  insert into audit_log (organization_id, user_id, action, metadata)
  values (v_org_id, auth.uid(), 'organization.bootstrap', jsonb_build_object('org_name', org_name, 'role', as_role));

  return v_profile;
end;
$$;

-- Any authenticated user may call this — the function body itself enforces
-- "only once, and only if you don't already have a profile".
grant execute on function bootstrap_organization(text, text, user_role) to authenticated;
