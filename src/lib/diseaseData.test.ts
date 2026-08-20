import { describe, it, expect } from "vitest";
import { DISEASE_CLASSES, DISEASE_KB, diseaseById } from "./diseaseData";

describe("DISEASE_CLASSES", () => {
  it("has unique ids", () => {
    const ids = DISEASE_CLASSES.map((d) => d.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("includes healthy and unknown as non-severity-capable", () => {
    expect(diseaseById("healthy")?.severityCapable).toBe(false);
    expect(diseaseById("unknown")?.severityCapable).toBe(false);
  });

  it("includes exactly the three configured diseases plus healthy/unknown", () => {
    const ids = DISEASE_CLASSES.map((d) => d.id).sort();
    expect(ids).toEqual(["cercospora", "healthy", "nclb", "rust", "unknown"].sort());
  });
});

describe("DISEASE_KB", () => {
  it("has a knowledge base entry for every severity-capable disease class", () => {
    const severityCapableIds = DISEASE_CLASSES.filter((d) => d.severityCapable).map((d) => d.id);
    for (const id of severityCapableIds) {
      expect(DISEASE_KB[id], `missing knowledge base entry for ${id}`).toBeDefined();
    }
  });

  it("every entry has non-empty required fields", () => {
    for (const [code, entry] of Object.entries(DISEASE_KB)) {
      expect(entry.name, code).toBeTruthy();
      expect(entry.description, code).toBeTruthy();
      expect(entry.symptoms, code).toBeTruthy();
      expect(entry.conditions, code).toBeTruthy();
      expect(entry.prevention, code).toBeTruthy();
      expect(entry.management, code).toBeTruthy();
      expect(entry.reference, code).toBeTruthy();
    }
  });
});
