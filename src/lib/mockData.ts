import type { Farmer, Farm, Field, Observation, Severity } from "./types";
import { DISEASE_CLASSES, MODEL_VERSION } from "./diseaseData";

// Seeded PRNG so demo data is stable across reloads
function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rnd = mulberry32(42);
const pick = <T,>(arr: T[]): T => arr[Math.floor(rnd() * arr.length)];
const randInt = (min: number, max: number) => Math.floor(rnd() * (max - min + 1)) + min;
const jitter = (v: number, amt: number) => v + (rnd() * 2 - 1) * amt;

const FIRST_NAMES = ["Tendai", "Chipo", "Farai", "Rutendo", "Blessing", "Tatenda", "Nyasha", "Kudzai", "Simba", "Rumbidzai", "Tafadzwa", "Vimbai", "Munashe", "Nomsa", "Takudzwa", "Panashe", "Anesu", "Fadzai", "Tapiwa", "Sekai"];
const LAST_NAMES = ["Moyo", "Ncube", "Sibanda", "Chikafu", "Mutasa", "Dube", "Chirwa", "Gumbo", "Mhlanga", "Mapfumo"];

export const REGIONS = ["Mashonaland Central", "Mashonaland West", "Manicaland", "Midlands", "Masvingo", "Matabeleland North"];

export const REGION_COORDS: Record<string, [number, number]> = {
  "Mashonaland Central": [-16.9, 31.3],
  "Mashonaland West": [-17.5, 29.8],
  Manicaland: [-19.0, 32.7],
  Midlands: [-19.2, 29.8],
  Masvingo: [-20.3, 30.9],
  "Matabeleland North": [-18.5, 27.5],
};

export function approxCoordsForRegion(region: string): [number, number] {
  const base = REGION_COORDS[region] ?? REGION_COORDS[REGIONS[0]];
  const jitterAmt = 0.4;
  return [base[0] + (Math.random() * 2 - 1) * jitterAmt, base[1] + (Math.random() * 2 - 1) * jitterAmt];
}

export interface SeedDB {
  farmers: Farmer[];
  farms: Farm[];
  fields: Field[];
  observations: Observation[];
}

export function generateSeedData(): SeedDB {
  const farmers: Farmer[] = [];
  for (let i = 0; i < 20; i++) {
    farmers.push({ id: "F" + (i + 1), name: `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`, region: pick(REGIONS), orgId: "org-1" });
  }

  const farms: Farm[] = [];
  for (let i = 0; i < 10; i++) {
    const farmer = farmers[i % farmers.length];
    farms.push({ id: "FM" + (i + 1), name: `${farmer.name.split(" ")[0]}'s Farm`, farmerId: farmer.id, region: farmer.region });
  }

  const fields: Field[] = [];
  for (let i = 0; i < 30; i++) {
    const farm = farms[i % farms.length];
    const [lat, lng] = REGION_COORDS[farm.region];
    fields.push({
      id: "FLD" + (i + 1),
      name: `Field ${String.fromCharCode(65 + (i % 6))}${Math.ceil((i + 1) / 6)}`,
      farmId: farm.id,
      region: farm.region,
      crop: "Maize",
      variety: pick(["SC719", "ZM523", "PAN53", "SC627"]),
      plantingDate: `2026-${String(randInt(9, 12)).padStart(2, "0")}-${String(randInt(1, 28)).padStart(2, "0")}`,
      areaHa: randInt(8, 60) / 10,
      lat: jitter(lat, 0.9),
      lng: jitter(lng, 0.9),
    });
  }

  const observations: Observation[] = [];
  let obsCounter = 1;
  const clusterRegion = "Mashonaland Central";
  const clusterFields = fields.filter((f) => f.region === clusterRegion);

  function addObs(field: Field, diseaseId: string, severity: Severity | null, confidence: number, daysAgo: number, forceReview?: boolean) {
    const disease = DISEASE_CLASSES.find((d) => d.id === diseaseId)!;
    const id = "OBS" + obsCounter++;
    const created = new Date(Date.now() - daysAgo * 86400000);
    const reviewRoll = forceReview !== undefined ? forceReview : rnd() < 0.55;
    let review: Observation["review"] = null;
    let status: Observation["status"] = "pending";
    if (reviewRoll) {
      const agree = rnd() < 0.78;
      const finalDiseaseId = agree ? diseaseId : pick(DISEASE_CLASSES.filter((d) => d.id !== diseaseId)).id;
      review = {
        reviewer: pick(["Agron. T. Chikafu", "Agron. R. Sibanda", "Agron. B. Moyo"]),
        status: agree ? "confirmed" : "corrected",
        finalDiseaseId,
        finalSeverity: severity,
        notes: agree ? "AI assessment consistent with field symptoms." : "Visual pattern more consistent with alternate diagnosis; recommend follow-up scouting.",
        reviewedAt: new Date(created.getTime() + 86400000 * randInt(1, 3)).toISOString(),
      };
      status = review.status as Observation["status"];
    }
    const farm = farms.find((f) => f.id === field.farmId)!;
    observations.push({
      id,
      fieldId: field.id,
      farmId: field.farmId,
      farmerId: farm.farmerId,
      region: field.region,
      crop: "Maize",
      diseaseId,
      diseaseName: disease.name,
      confidence,
      severity: disease.severityCapable ? severity : null,
      modelVersion: MODEL_VERSION,
      createdAt: created.toISOString(),
      status,
      review,
      lat: jitter(field.lat, 0.05),
      lng: jitter(field.lng, 0.05),
    });
  }

  // Deliberate cluster: Northern Leaf Blight across Mashonaland Central, trending up (drives the outbreak demo)
  const outbreakFieldSample = clusterFields.slice(0, Math.min(9, clusterFields.length));
  outbreakFieldSample.forEach((field, idx) => {
    const nObsForField = idx < 4 ? 2 : 1;
    for (let k = 0; k < nObsForField; k++) {
      const daysAgo = Math.max(randInt(1, 18) - (idx % 3), 0);
      addObs(field, "nclb", pick(["Moderate", "Severe", "Moderate"]) as Severity, 0.72 + rnd() * 0.24, daysAgo);
    }
  });

  const severities: Severity[] = ["Mild", "Moderate", "Severe"];
  while (observations.length < 100) {
    const field = pick(fields);
    const diseaseId = pick(DISEASE_CLASSES).id;
    const severity = pick(severities);
    addObs(field, diseaseId, severity, 0.55 + rnd() * 0.42, randInt(0, 60));
  }

  observations.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return { farmers, farms, fields, observations };
}
