-- =============================================================================
-- CropSight — Row Level Security
-- Enforces multi-tenant isolation at the database layer, per the product
-- requirement that authorization never relies on the frontend alone.
-- Run after 0001_schema.sql.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Helper functions — read the calling user's org/role once per statement.
-- SECURITY DEFINER + a fixed search_path so these can't be hijacked, and so
-- they can read `profiles` even though `profiles` itself has RLS enabled.
-- ---------------------------------------------------------------------------
create or replace function current_org()
returns uuid
language sql stable security definer set search_path = public as $$
  select organization_id from profiles where id = auth.uid();
$$;

create or replace function current_role_name()
returns user_role
language sql stable security definer set search_path = public as $$
  select role from profiles where id = auth.uid();
$$;

create or replace function is_elevated()
returns boolean
language sql stable security definer set search_path = public as $$
  select current_role_name() in ('agronomist', 'company_admin', 'platform_admin');
$$;

create or replace function is_admin()
returns boolean
language sql stable security definer set search_path = public as $$
  select current_role_name() in ('company_admin', 'platform_admin');
$$;

-- ---------------------------------------------------------------------------
-- Enable RLS everywhere. No table is left with RLS off.
-- ---------------------------------------------------------------------------
alter table organizations         enable row level security;
alter table profiles              enable row level security;
alter table farms                 enable row level security;
alter table fields                enable row level security;
alter table crops                 enable row level security;
alter table crop_diseases         enable row level security;
alter table disease_knowledge     enable row level security;
alter table recommendations       enable row level security;
alter table images                enable row level security;
alter table model_versions        enable row level security;
alter table observations          enable row level security;
alter table predictions           enable row level security;
alter table agronomist_reviews    enable row level security;
alter table outbreak_thresholds   enable row level security;
alter table outbreaks             enable row level security;
alter table audit_log             enable row level security;

-- ---------------------------------------------------------------------------
-- organizations — members can read their own org only
-- ---------------------------------------------------------------------------
create policy org_select on organizations for select
  using (id = current_org());

create policy org_update_admin on organizations for update
  using (id = current_org() and is_admin());

-- ---------------------------------------------------------------------------
-- profiles — read your own row or teammates in the same org; only admins
-- can change someone else's role
-- ---------------------------------------------------------------------------
create policy profiles_select_self on profiles for select
  using (id = auth.uid());

create policy profiles_select_org on profiles for select
  using (organization_id = current_org());

create policy profiles_update_self on profiles for update
  using (id = auth.uid());

create policy profiles_update_admin on profiles for update
  using (organization_id = current_org() and is_admin());

-- ---------------------------------------------------------------------------
-- farms — org-scoped read; farmers manage their own farms, admins manage all
-- ---------------------------------------------------------------------------
create policy farms_select on farms for select
  using (organization_id = current_org());

create policy farms_insert on farms for insert
  with check (organization_id = current_org() and (owner_id = auth.uid() or is_admin()));

create policy farms_update on farms for update
  using (organization_id = current_org() and (owner_id = auth.uid() or is_admin()));

create policy farms_delete on farms for delete
  using (organization_id = current_org() and (owner_id = auth.uid() or is_admin()));

-- ---------------------------------------------------------------------------
-- fields — scoped through the parent farm's organization
-- ---------------------------------------------------------------------------
create policy fields_select on fields for select
  using (exists (select 1 from farms f where f.id = fields.farm_id and f.organization_id = current_org()));

create policy fields_insert on fields for insert
  with check (exists (
    select 1 from farms f where f.id = fields.farm_id
    and f.organization_id = current_org()
    and (f.owner_id = auth.uid() or is_admin())
  ));

create policy fields_update on fields for update
  using (exists (
    select 1 from farms f where f.id = fields.farm_id
    and f.organization_id = current_org()
    and (f.owner_id = auth.uid() or is_admin())
  ));

-- ---------------------------------------------------------------------------
-- crops / crop_diseases / disease_knowledge / recommendations
-- reference data — readable by any authenticated user, writable by admins
-- ---------------------------------------------------------------------------
create policy crops_select on crops for select using (auth.role() = 'authenticated');
create policy crops_write on crops for all using (is_admin()) with check (is_admin());

create policy crop_diseases_select on crop_diseases for select using (auth.role() = 'authenticated');
create policy crop_diseases_write on crop_diseases for all using (is_admin()) with check (is_admin());

create policy disease_knowledge_select on disease_knowledge for select using (auth.role() = 'authenticated');
create policy disease_knowledge_write on disease_knowledge for all using (is_admin()) with check (is_admin());

create policy recommendations_select on recommendations for select using (auth.role() = 'authenticated');
create policy recommendations_write on recommendations for all using (is_admin()) with check (is_admin());

create policy model_versions_select on model_versions for select using (auth.role() = 'authenticated');
create policy model_versions_write on model_versions for all using (is_admin()) with check (is_admin());

-- ---------------------------------------------------------------------------
-- images — uploader can read their own; org-elevated roles can read any
-- image tied to an observation in their org
-- ---------------------------------------------------------------------------
create policy images_select_own on images for select
  using (uploaded_by = auth.uid());

create policy images_select_org on images for select
  using (exists (
    select 1 from observations o where o.image_id = images.id and o.organization_id = current_org() and is_elevated()
  ));

create policy images_insert on images for insert
  with check (uploaded_by = auth.uid());

-- ---------------------------------------------------------------------------
-- observations — org-scoped read; farmers insert for their own fields;
-- review-status updates restricted to elevated roles
-- ---------------------------------------------------------------------------
create policy observations_select on observations for select
  using (organization_id = current_org());

create policy observations_insert on observations for insert
  with check (
    organization_id = current_org()
    and exists (
      select 1 from fields fl join farms fm on fm.id = fl.farm_id
      where fl.id = observations.field_id and (fm.owner_id = auth.uid() or is_admin())
    )
  );

create policy observations_update_elevated on observations for update
  using (organization_id = current_org() and is_elevated());

-- ---------------------------------------------------------------------------
-- predictions — org-scoped read only; inserts happen server-side via the
-- Netlify Function using the Supabase service role key (bypasses RLS by
-- design, since it runs after a trusted inference call — never insert
-- predictions directly from the browser with the anon key)
-- ---------------------------------------------------------------------------
create policy predictions_select on predictions for select
  using (exists (
    select 1 from observations o where o.id = predictions.observation_id and o.organization_id = current_org()
  ));

-- ---------------------------------------------------------------------------
-- agronomist_reviews — org-scoped read; only agronomists/admins write
-- ---------------------------------------------------------------------------
create policy reviews_select on agronomist_reviews for select
  using (exists (
    select 1 from observations o where o.id = agronomist_reviews.observation_id and o.organization_id = current_org()
  ));

create policy reviews_insert on agronomist_reviews for insert
  with check (
    is_elevated()
    and exists (select 1 from observations o where o.id = agronomist_reviews.observation_id and o.organization_id = current_org())
  );

create policy reviews_update on agronomist_reviews for update
  using (
    is_elevated()
    and exists (select 1 from observations o where o.id = agronomist_reviews.observation_id and o.organization_id = current_org())
  );

-- ---------------------------------------------------------------------------
-- outbreak_thresholds / outbreaks — org-scoped, admin-managed
-- ---------------------------------------------------------------------------
create policy thresholds_select on outbreak_thresholds for select
  using (organization_id = current_org());

create policy thresholds_write on outbreak_thresholds for all
  using (organization_id = current_org() and is_admin())
  with check (organization_id = current_org() and is_admin());

create policy outbreaks_select on outbreaks for select
  using (organization_id = current_org());

-- outbreaks are written by the scheduled detection function using the
-- service role key (see netlify/functions/detect-outbreaks-scheduled.ts) —
-- no user-facing write policy is needed.

-- ---------------------------------------------------------------------------
-- audit_log — org-scoped read for admins; inserts happen via service role
-- from server-side code paths, not directly from the browser
-- ---------------------------------------------------------------------------
create policy audit_select_admin on audit_log for select
  using (organization_id = current_org() and is_admin());
