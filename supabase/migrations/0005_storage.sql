-- =============================================================================
-- CropSight — object storage
-- Images are stored privately, under a path prefixed by organization id:
--   observation-images/<organization_id>/<image_id>.jpg
-- Primary uploads happen server-side (Netlify Function, service role — see
-- netlify/functions/predict.ts), which bypasses these policies by design.
-- These policies exist as defense-in-depth and to support any future
-- direct-from-client upload path.
-- =============================================================================

insert into storage.buckets (id, name, public)
values ('observation-images', 'observation-images', false)
on conflict (id) do nothing;

create policy "org-scoped read" on storage.objects for select
  using (
    bucket_id = 'observation-images'
    and (storage.foldername(name))[1] = current_org()::text
  );

create policy "org-scoped insert" on storage.objects for insert
  with check (
    bucket_id = 'observation-images'
    and (storage.foldername(name))[1] = current_org()::text
  );

create policy "org-scoped delete admin only" on storage.objects for delete
  using (
    bucket_id = 'observation-images'
    and (storage.foldername(name))[1] = current_org()::text
    and is_admin()
  );
