-- =============================================================================
-- CropSight — reference data seed
-- Safe to re-run against a fresh database. Does not include demo farmer/farm
-- data — see supabase/seed_demo_data.sql for that (optional, for staging only).
-- =============================================================================

insert into crops (name, enabled) values ('Maize', true)
  on conflict (name) do nothing;

do $$
declare
  v_maize_id uuid;
  v_healthy_id uuid;
  v_cercospora_id uuid;
  v_rust_id uuid;
  v_nclb_id uuid;
begin
  select id into v_maize_id from crops where name = 'Maize';

  insert into crop_diseases (crop_id, code, name, scientific_name, severity_capable)
    values (v_maize_id, 'healthy', 'Healthy', null, false)
    on conflict (crop_id, code) do nothing
    returning id into v_healthy_id;

  insert into crop_diseases (crop_id, code, name, scientific_name, severity_capable)
    values (v_maize_id, 'cercospora', 'Cercospora Leaf Spot', 'Cercospora zeae-maydis / C. zeina', true)
    on conflict (crop_id, code) do nothing
    returning id into v_cercospora_id;

  insert into crop_diseases (crop_id, code, name, scientific_name, severity_capable)
    values (v_maize_id, 'rust', 'Common Rust', 'Puccinia sorghi', true)
    on conflict (crop_id, code) do nothing
    returning id into v_rust_id;

  insert into crop_diseases (crop_id, code, name, scientific_name, severity_capable)
    values (v_maize_id, 'nclb', 'Northern Leaf Blight', 'Exserohilum turcicum', true)
    on conflict (crop_id, code) do nothing
    returning id into v_nclb_id;

  insert into crop_diseases (crop_id, code, name, scientific_name, severity_capable)
    values (v_maize_id, 'unknown', 'Other / Unknown', null, false)
    on conflict (crop_id, code) do nothing;

  -- Re-select ids in case the inserts above hit ON CONFLICT DO NOTHING (id would be null otherwise)
  select id into v_cercospora_id from crop_diseases where crop_id = v_maize_id and code = 'cercospora';
  select id into v_rust_id       from crop_diseases where crop_id = v_maize_id and code = 'rust';
  select id into v_nclb_id       from crop_diseases where crop_id = v_maize_id and code = 'nclb';

  insert into disease_knowledge (crop_disease_id, description, symptoms, typical_conditions, prevention_info, management_info, references_list, last_reviewed_at)
  values (
    v_cercospora_id,
    'Cercospora Leaf Spot, also known as Gray Leaf Spot, is a fungal foliar disease of maize that reduces the leaf area available for photosynthesis. In severe, early-onset cases it can cause meaningful yield loss, particularly where susceptible varieties are grown in continuous maize rotations.',
    'Small, tan to brown flecks appear first on lower leaves, then expand into narrow, rectangular lesions running parallel to the leaf veins. Mature lesions turn grey to tan and can merge, causing large areas of the leaf to die back (blight) under heavy pressure.',
    'Favoured by warm temperatures (around 22-30C), prolonged leaf wetness, high humidity, and dense canopies with poor airflow. Risk is elevated in reduced-tillage fields where infected maize residue remains on the soil surface, and in continuous maize-on-maize rotations.',
    'Rotate out of maize for at least one season where practical; select hybrids with documented Gray Leaf Spot tolerance for your region; avoid excessive planting density in high-risk fields; manage residue through tillage or incorporation where soil conservation goals allow.',
    'Severity assessment should guide any input decision. In-season fungicide application can be justified under high disease pressure on susceptible hybrids, but timing and product choice should be confirmed with a registered agronomist rather than applied on the basis of an AI photo assessment alone.',
    array['General field-crop pathology references (CIMMYT, FAO Southern Africa maize disease guidance); adapt to locally validated Zimbabwe/Agritex advisories where available.'],
    current_date
  )
  on conflict (crop_disease_id) do nothing;

  insert into disease_knowledge (crop_disease_id, description, symptoms, typical_conditions, prevention_info, management_info, references_list, last_reviewed_at)
  values (
    v_rust_id,
    'Common Rust is a fungal disease that produces characteristic rust-coloured pustules on maize leaves. Most commercial hybrids carry adequate tolerance, so Common Rust is usually a secondary concern compared with leaf blight diseases — but early, heavy infections on susceptible material can still affect yield.',
    'Small, circular to elongated cinnamon-brown pustules erupt through the leaf surface on both the upper and lower sides of the leaf, later darkening as the pustules mature and release spores. Pustules may be scattered across the whole leaf under high pressure.',
    'Cooler temperatures (roughly 16-23C) combined with high humidity and heavy dew favour spore germination and spread. Rust can spread rapidly once conditions are favourable because spores travel readily on wind.',
    'Plant resistant or tolerant hybrids, which is the primary and most cost-effective control; avoid excessive nitrogen application, which can promote dense, humid canopies; scout early-planted fields more closely since they are more exposed to early-season spore loads.',
    'Most seasons do not require fungicide intervention where resistant hybrids are used. Under sustained pressure on susceptible material, especially at early growth stages, a registered agronomist can advise on whether a fungicide application is warranted.',
    array['General field-crop pathology references (FAO Southern Africa maize pest and disease notes); adapt to locally validated Zimbabwe/Agritex advisories where available.'],
    current_date
  )
  on conflict (crop_disease_id) do nothing;

  insert into disease_knowledge (crop_disease_id, description, symptoms, typical_conditions, prevention_info, management_info, references_list, last_reviewed_at)
  values (
    v_nclb_id,
    'Northern Leaf Blight (Northern Corn Leaf Blight) is one of the most significant foliar diseases of maize in Southern Africa. Under favourable conditions it can spread quickly up the plant and cause substantial loss of green leaf area during grain fill, when the crop most needs it.',
    'Long, cigar-shaped, grey-green to tan lesions form parallel to the leaf veins, typically starting on the lower, older leaves and progressing up the plant over the season. Lesions can coalesce under heavy pressure, giving affected leaves a scorched, blighted appearance.',
    'Favoured by moderate temperatures (roughly 18-27C) and extended periods of leaf wetness from dew, fog, or frequent rain. Disease pressure builds season over season where infected residue is left on the soil surface, particularly in continuous maize rotations.',
    'Use hybrids with documented Northern Leaf Blight resistance for your region; rotate away from maize (and where relevant, sorghum) for one to two seasons; manage or incorporate infected crop residue to reduce carryover inoculum for the next planting.',
    'Severity and growth-stage assessment should guide any decision. Fungicide application can be economically justified under high disease pressure at susceptible growth stages on susceptible hybrids, but the decision — product, rate, and timing — should be confirmed with a registered agronomist rather than taken from an AI photo assessment alone.',
    array['General field-crop pathology references (CIMMYT Maize Disease Field Guide, FAO Southern Africa guidance); adapt to locally validated Zimbabwe/Agritex advisories where available.'],
    current_date
  )
  on conflict (crop_disease_id) do nothing;
end $$;

insert into model_versions (name, crop_name, is_active, released_at, notes)
values ('cropsight-model', 'Maize', true, now(), 'Live inference workflow — see netlify/functions/predict.ts')
on conflict (name) do nothing;

insert into model_versions (name, crop_name, is_active, released_at, notes)
values ('mock-fallback', 'Maize', false, now(), 'Automatic fallback used when the live endpoint is unreachable')
on conflict (name) do nothing;
