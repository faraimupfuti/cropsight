-- =============================================================================
-- CropSight — core schema
-- Run via the Supabase SQL editor, or `supabase db push` with the Supabase CLI.
-- Designed for Postgres + Supabase Auth (auth.users) + Row Level Security.
-- =============================================================================

create extension if not exists "pgcrypto"; -- gen_random_uuid()

-- ---------------------------------------------------------------------------
-- ENUMS
-- ---------------------------------------------------------------------------
create type user_role as enum ('farmer', 'agronomist', 'company_admin', 'researcher', 'platform_admin');
create type severity as enum ('mild', 'moderate', 'severe');
create type review_status as enum ('pending', 'confirmed', 'corrected', 'uncertain');
create type outbreak_status as enum ('potential', 'dismissed', 'escalated');
create type subscription_tier as enum ('free', 'pro', 'agribusiness', 'enterprise');

-- ---------------------------------------------------------------------------
-- ORGANIZATIONS & PROFILES
-- profiles.id === auth.users.id (1:1). This is how Supabase Auth users gain
-- an organization, a role, and a display name in the app.
-- ---------------------------------------------------------------------------
create table organizations (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  tier         subscription_tier not null default 'free',
  country      text not null default 'ZW',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create table profiles (
  id               uuid primary key references auth.users(id) on delete cascade,
  organization_id  uuid references organizations(id) on delete set null,
  full_name        text not null,
  role             user_role not null default 'farmer',
  phone            text,
  region           text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index idx_profiles_org on profiles(organization_id);
create index idx_profiles_role on profiles(role);

-- ---------------------------------------------------------------------------
-- FARMS / FIELDS / LOCATIONS
-- ---------------------------------------------------------------------------
create table farms (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references organizations(id) on delete cascade,
  owner_id         uuid not null references profiles(id) on delete cascade,
  name             text not null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index idx_farms_org on farms(organization_id);
create index idx_farms_owner on farms(owner_id);

create table crops (
  id        uuid primary key default gen_random_uuid(),
  name      text not null unique, -- "Maize"
  enabled   boolean not null default true,
  created_at timestamptz not null default now()
);

create table fields (
  id             uuid primary key default gen_random_uuid(),
  farm_id        uuid not null references farms(id) on delete cascade,
  crop_id        uuid not null references crops(id),
  name           text not null,
  variety        text,
  planting_date  date,
  area_hectares  numeric(6,2),
  latitude       double precision,
  longitude      double precision,
  region         text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index idx_fields_farm on fields(farm_id);
create index idx_fields_crop on fields(crop_id);
create index idx_fields_latlng on fields(latitude, longitude);

-- ---------------------------------------------------------------------------
-- DISEASE CONFIGURATION (admin-manageable, not hardcoded)
-- ---------------------------------------------------------------------------
create table crop_diseases (
  id                uuid primary key default gen_random_uuid(),
  crop_id           uuid not null references crops(id),
  code              text not null,            -- "nclb", "rust", "cercospora" — stable key used by ML integration
  name              text not null,            -- "Northern Leaf Blight"
  scientific_name   text,
  severity_capable  boolean not null default true,
  active            boolean not null default true,
  unique (crop_id, code)
);
create index idx_crop_diseases_crop on crop_diseases(crop_id);

create table disease_knowledge (
  id                  uuid primary key default gen_random_uuid(),
  crop_disease_id     uuid not null unique references crop_diseases(id) on delete cascade,
  description         text not null,
  symptoms            text not null,
  typical_conditions  text not null,
  prevention_info     text not null,
  management_info     text not null,
  references_list     text[] not null default '{}',
  last_reviewed_at    date,
  last_reviewed_by    text
);

create table recommendations (
  id                     uuid primary key default gen_random_uuid(),
  disease_knowledge_id   uuid not null references disease_knowledge(id) on delete cascade,
  text                   text not null,
  approved_by            uuid references profiles(id),
  approved_at            timestamptz,
  created_at             timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- IMAGE / OBSERVATION / PREDICTION / REVIEW PIPELINE
-- ---------------------------------------------------------------------------
create table images (
  id               uuid primary key default gen_random_uuid(),
  storage_bucket   text not null default 'observation-images',
  storage_path     text not null,        -- Supabase Storage object path, never a raw DB blob
  thumbnail_path   text,
  mime_type        text not null,
  size_bytes       integer not null,
  width            integer,
  height           integer,
  checksum         text,                  -- for duplicate-submission detection
  uploaded_by      uuid not null references profiles(id),
  created_at       timestamptz not null default now()
);
create index idx_images_checksum on images(checksum);

create table model_versions (
  id            uuid primary key default gen_random_uuid(),
  name          text not null unique,     -- "cropsight-model", "maize-v1"
  crop_name     text not null,
  is_active     boolean not null default false,
  released_at   timestamptz,
  notes         text
);

create table observations (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references organizations(id) on delete cascade,
  field_id         uuid not null references fields(id) on delete cascade,
  image_id         uuid not null unique references images(id),
  crop_disease_id  uuid references crop_diseases(id),  -- final/validated disease; null until reviewed
  severity         severity,
  review_status    review_status not null default 'pending',
  latitude         double precision,
  longitude        double precision,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index idx_observations_org on observations(organization_id);
create index idx_observations_field on observations(field_id);
create index idx_observations_disease on observations(crop_disease_id);
create index idx_observations_status on observations(review_status);
create index idx_observations_created on observations(created_at);
create index idx_observations_latlng on observations(latitude, longitude);

create table predictions (
  id                uuid primary key default gen_random_uuid(),
  observation_id    uuid not null references observations(id) on delete cascade,
  crop_disease_id   uuid not null references crop_diseases(id),
  confidence        numeric(4,3) not null check (confidence >= 0 and confidence <= 1),
  severity          severity,
  model_version_id  uuid not null references model_versions(id),
  source            text not null default 'live', -- 'live' | 'mock'
  inference_at      timestamptz not null default now()
);
create index idx_predictions_observation on predictions(observation_id);
create index idx_predictions_model on predictions(model_version_id);

create table agronomist_reviews (
  id                    uuid primary key default gen_random_uuid(),
  observation_id        uuid not null unique references observations(id) on delete cascade,
  reviewer_id           uuid not null references profiles(id),
  status                review_status not null, -- confirmed | corrected | uncertain
  corrected_disease_id  uuid references crop_diseases(id),
  corrected_severity    severity,
  notes                 text,
  reviewed_at           timestamptz not null default now()
);
create index idx_reviews_reviewer on agronomist_reviews(reviewer_id);

-- ---------------------------------------------------------------------------
-- OUTBREAK DETECTION
-- ---------------------------------------------------------------------------
create table outbreak_thresholds (
  id                   uuid primary key default gen_random_uuid(),
  organization_id      uuid not null references organizations(id) on delete cascade,
  crop_disease_id      uuid references crop_diseases(id), -- null = applies to all diseases for the crop
  min_affected_fields  integer not null default 5,
  min_observations     integer not null default 8,
  window_days          integer not null default 21,
  updated_at           timestamptz not null default now(),
  unique (organization_id, crop_disease_id)
);

create table outbreaks (
  id                 uuid primary key default gen_random_uuid(),
  organization_id    uuid not null references organizations(id) on delete cascade,
  region             text not null,
  crop_disease_id    uuid not null references crop_diseases(id),
  status             outbreak_status not null default 'potential',
  affected_fields    integer not null,
  observation_count  integer not null,
  window_start       timestamptz not null,
  window_end         timestamptz not null,
  detected_at        timestamptz not null default now()
);
create index idx_outbreaks_org on outbreaks(organization_id);
create index idx_outbreaks_status on outbreaks(status);

-- ---------------------------------------------------------------------------
-- AUDIT LOG
-- ---------------------------------------------------------------------------
create table audit_log (
  id                uuid primary key default gen_random_uuid(),
  organization_id   uuid references organizations(id),
  user_id           uuid references profiles(id),
  action            text not null, -- "observation.review", "dataset.export", ...
  metadata          jsonb,
  created_at        timestamptz not null default now()
);
create index idx_audit_org on audit_log(organization_id);
create index idx_audit_user on audit_log(user_id);
create index idx_audit_created on audit_log(created_at);

-- ---------------------------------------------------------------------------
-- updated_at auto-touch trigger, applied to every table that has the column
-- ---------------------------------------------------------------------------
create or replace function touch_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_organizations_touch before update on organizations for each row execute function touch_updated_at();
create trigger trg_profiles_touch before update on profiles for each row execute function touch_updated_at();
create trigger trg_farms_touch before update on farms for each row execute function touch_updated_at();
create trigger trg_fields_touch before update on fields for each row execute function touch_updated_at();
create trigger trg_observations_touch before update on observations for each row execute function touch_updated_at();
