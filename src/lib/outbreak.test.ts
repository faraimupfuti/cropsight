import { describe, it, expect } from "vitest";
import { detectOutbreaks } from "./store";
import type { Observation } from "./types";

function makeObs(overrides: Partial<Observation>): Observation {
  return {
    id: "OBS1",
    fieldId: "FLD1",
    farmId: "FM1",
    farmerId: "F1",
    region: "Mashonaland Central",
    crop: "Maize",
    diseaseId: "nclb",
    diseaseName: "Northern Leaf Blight",
    confidence: 0.9,
    severity: "Moderate",
    modelVersion: "test",
    createdAt: new Date().toISOString(),
    status: "pending",
    review: null,
    lat: -17,
    lng: 31,
    ...overrides,
  };
}

const threshold = { minFields: 3, minObservations: 5, windowDays: 21 };

describe("detectOutbreaks", () => {
  it("does not flag when below both thresholds", () => {
    const db = {
      farmers: [],
      farms: [],
      fields: [],
      observations: [makeObs({ fieldId: "FLD1" }), makeObs({ fieldId: "FLD2" })],
    };
    expect(detectOutbreaks(db as any, threshold)).toHaveLength(0);
  });

  it("flags when the affected-field count meets the threshold", () => {
    const db = {
      farmers: [],
      farms: [],
      fields: [],
      observations: [
        makeObs({ fieldId: "FLD1" }),
        makeObs({ fieldId: "FLD2" }),
        makeObs({ fieldId: "FLD3" }),
      ],
    };
    const result = detectOutbreaks(db as any, threshold);
    expect(result).toHaveLength(1);
    expect(result[0].fieldCount).toBe(3);
    expect(result[0].diseaseName).toBe("Northern Leaf Blight");
  });

  it("flags when the observation count meets the threshold even across fewer fields", () => {
    const db = {
      farmers: [],
      farms: [],
      fields: [],
      observations: Array.from({ length: 5 }, () => makeObs({ fieldId: "FLD1" })),
    };
    const result = detectOutbreaks(db as any, threshold);
    expect(result).toHaveLength(1);
    expect(result[0].obsCount).toBe(5);
  });

  it("ignores healthy observations entirely", () => {
    const db = {
      farmers: [],
      farms: [],
      fields: [],
      observations: Array.from({ length: 6 }, (_, i) =>
        makeObs({ fieldId: "FLD" + i, diseaseId: "healthy", diseaseName: "Healthy" })
      ),
    };
    expect(detectOutbreaks(db as any, threshold)).toHaveLength(0);
  });

  it("ignores observations outside the time window", () => {
    const old = new Date(Date.now() - 40 * 86400000).toISOString();
    const db = {
      farmers: [],
      farms: [],
      fields: [],
      observations: [
        makeObs({ fieldId: "FLD1", createdAt: old }),
        makeObs({ fieldId: "FLD2", createdAt: old }),
        makeObs({ fieldId: "FLD3", createdAt: old }),
      ],
    };
    expect(detectOutbreaks(db as any, threshold)).toHaveLength(0);
  });

  it("keeps regions and diseases separate", () => {
    const db = {
      farmers: [],
      farms: [],
      fields: [],
      observations: [
        makeObs({ fieldId: "FLD1", region: "Mashonaland Central" }),
        makeObs({ fieldId: "FLD2", region: "Midlands" }),
        makeObs({ fieldId: "FLD3", region: "Manicaland" }),
      ],
    };
    // 1 observation per region/disease combo — none crosses the per-group threshold
    expect(detectOutbreaks(db as any, threshold)).toHaveLength(0);
  });
});
