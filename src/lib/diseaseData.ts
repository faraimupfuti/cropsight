import type { DiseaseClass, DiseaseKnowledgeEntry } from "./types";

// ---------------------------------------------------------------------
// Configurable disease classes — matches the model's output classes.
// Update CLASS_LABEL_MAP in netlify/functions/predict.ts if your model's
// label strings differ from the "id" values here.
// ---------------------------------------------------------------------
export const DISEASE_CLASSES: DiseaseClass[] = [
  { id: "healthy", name: "Healthy", severityCapable: false },
  { id: "cercospora", name: "Cercospora Leaf Spot", severityCapable: true },
  { id: "rust", name: "Common Rust", severityCapable: true },
  { id: "nclb", name: "Northern Leaf Blight", severityCapable: true },
  { id: "unknown", name: "Other / Unknown", severityCapable: false },
];

export const diseaseById = (id: string) => DISEASE_CLASSES.find((d) => d.id === id);

// ---------------------------------------------------------------------
// Agronomic knowledge base. General, widely-documented field-crop
// pathology information written for this platform — not sourced
// verbatim from any single publication. Always shown with a reference
// line and a "consult a qualified agronomist" caveat, per product
// requirements: CropSight never presents this as a substitute for
// professional advice, and recommendations are reviewable/editable by
// administrators and agronomists before farmers see them.
// ---------------------------------------------------------------------
export const DISEASE_KB: Record<string, DiseaseKnowledgeEntry> = {
  cercospora: {
    name: "Cercospora Leaf Spot",
    scientificName: "Cercospora zeae-maydis / C. zeina (Gray Leaf Spot complex)",
    description:
      "Cercospora Leaf Spot, also known as Gray Leaf Spot, is a fungal foliar disease of maize that reduces the leaf area available for photosynthesis. In severe, early-onset cases it can cause meaningful yield loss, particularly where susceptible varieties are grown in continuous maize rotations.",
    symptoms:
      "Small, tan to brown flecks appear first on lower leaves, then expand into narrow, rectangular lesions running parallel to the leaf veins. Mature lesions turn grey to tan and can merge, causing large areas of the leaf to die back (blight) under heavy pressure.",
    conditions:
      "Favoured by warm temperatures (around 22–30°C), prolonged leaf wetness, high humidity, and dense canopies with poor airflow. Risk is elevated in reduced-tillage fields where infected maize residue remains on the soil surface, and in continuous maize-on-maize rotations.",
    prevention:
      "Rotate out of maize for at least one season where practical; select hybrids with documented Gray Leaf Spot tolerance for your region; avoid excessive planting density in high-risk fields; manage residue through tillage or incorporation where soil conservation goals allow.",
    management:
      "Severity assessment should guide any input decision. In-season fungicide application can be justified under high disease pressure on susceptible hybrids, but timing and product choice should be confirmed with a registered agronomist rather than applied on the basis of an AI photo assessment alone.",
    reference: "General field-crop pathology references (CIMMYT, FAO Southern Africa maize disease guidance); adapt to locally validated Zimbabwe/Agritex advisories where available.",
    reviewed: "2026-06-01",
  },
  rust: {
    name: "Common Rust",
    scientificName: "Puccinia sorghi",
    description:
      "Common Rust is a fungal disease that produces characteristic rust-coloured pustules on maize leaves. Most commercial hybrids carry adequate tolerance, so Common Rust is usually a secondary concern compared with leaf blight diseases — but early, heavy infections on susceptible material can still affect yield.",
    symptoms:
      "Small, circular to elongated cinnamon-brown pustules erupt through the leaf surface on both the upper and lower sides of the leaf, later darkening as the pustules mature and release spores. Pustules may be scattered across the whole leaf under high pressure.",
    conditions:
      "Cooler temperatures (roughly 16–23°C) combined with high humidity and heavy dew favour spore germination and spread. Rust can spread rapidly once conditions are favourable because spores travel readily on wind.",
    prevention:
      "Plant resistant or tolerant hybrids, which is the primary and most cost-effective control; avoid excessive nitrogen application, which can promote dense, humid canopies; scout early-planted fields more closely since they are more exposed to early-season spore loads.",
    management:
      "Most seasons do not require fungicide intervention where resistant hybrids are used. Under sustained pressure on susceptible material, especially at early growth stages, a registered agronomist can advise on whether a fungicide application is warranted.",
    reference: "General field-crop pathology references (FAO Southern Africa maize pest and disease notes); adapt to locally validated Zimbabwe/Agritex advisories where available.",
    reviewed: "2026-06-01",
  },
  nclb: {
    name: "Northern Leaf Blight",
    scientificName: "Exserohilum turcicum (syn. Setosphaeria turcica)",
    description:
      "Northern Leaf Blight (Northern Corn Leaf Blight) is one of the most significant foliar diseases of maize in Southern Africa. Under favourable conditions it can spread quickly up the plant and cause substantial loss of green leaf area during grain fill, when the crop most needs it.",
    symptoms:
      "Long, cigar-shaped, grey-green to tan lesions form parallel to the leaf veins, typically starting on the lower, older leaves and progressing up the plant over the season. Lesions can coalesce under heavy pressure, giving affected leaves a scorched, blighted appearance.",
    conditions:
      "Favoured by moderate temperatures (roughly 18–27°C) and extended periods of leaf wetness from dew, fog, or frequent rain. Disease pressure builds season over season where infected residue is left on the soil surface, particularly in continuous maize rotations.",
    prevention:
      "Use hybrids with documented Northern Leaf Blight resistance for your region; rotate away from maize (and where relevant, sorghum) for one to two seasons; manage or incorporate infected crop residue to reduce carryover inoculum for the next planting.",
    management:
      "Severity and growth-stage assessment should guide any decision. Fungicide application can be economically justified under high disease pressure at susceptible growth stages on susceptible hybrids, but the decision — product, rate, and timing — should be confirmed with a registered agronomist rather than taken from an AI photo assessment alone.",
    reference: "General field-crop pathology references (CIMMYT Maize Disease Field Guide, FAO Southern Africa guidance); adapt to locally validated Zimbabwe/Agritex advisories where available.",
    reviewed: "2026-06-01",
  },
};

export const MODEL_VERSION = "cropsight-model";
