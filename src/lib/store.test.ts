import { describe, it, expect } from "vitest";
import { useStore } from "./store";

describe("store — demo mode detection", () => {
  it("runs in demo mode when Supabase env vars are not set", () => {
    expect(useStore.getState().mode).toBe("demo");
  });
});

describe("store — addFarm (demo mode)", () => {
  it("adds a new farm owned by the demo farmer", async () => {
    const before = useStore.getState().db.farms.length;
    const farm = await useStore.getState().addFarm("Sunrise Farm");
    const after = useStore.getState().db.farms.length;

    expect(after).toBe(before + 1);
    expect(farm.name).toBe("Sunrise Farm");
    expect(farm.farmerId).toBe("F1");
    expect(useStore.getState().db.farms.map((f) => f.id)).toContain(farm.id);
  });
});

describe("store — addField (demo mode)", () => {
  it("adds a new field to the given farm, defaulting crop to Maize", async () => {
    const farm = await useStore.getState().addFarm("Coord Test Farm");
    const beforeCount = useStore.getState().db.fields.length;

    const field = await useStore.getState().addField(farm.id, {
      name: "Test Field",
      variety: "SC719",
      plantingDate: "2026-10-01",
      areaHa: 2.5,
      region: "Midlands",
    });

    expect(useStore.getState().db.fields.length).toBe(beforeCount + 1);
    expect(field.farmId).toBe(farm.id);
    expect(field.region).toBe("Midlands");
    expect(field.crop).toBe("Maize");
    expect(field.variety).toBe("SC719");
    expect(field.areaHa).toBe(2.5);
  });

  it("assigns coordinates roughly centered on the chosen region, not a fixed default", async () => {
    const farm = await useStore.getState().addFarm("Region Coord Farm");
    const field = await useStore.getState().addField(farm.id, {
      name: "Midlands Field",
      variety: "",
      plantingDate: "",
      areaHa: 0,
      region: "Midlands",
    });

    // Midlands centroid is roughly [-19.2, 29.8] with up to 0.4 degrees of jitter.
    expect(field.lat).toBeGreaterThan(-20);
    expect(field.lat).toBeLessThan(-18.5);
    expect(field.lng).toBeGreaterThan(29);
    expect(field.lng).toBeLessThan(30.6);
  });

  it("different regions produce meaningfully different coordinates", async () => {
    const farm = await useStore.getState().addFarm("Multi Region Farm");
    const midlands = await useStore.getState().addField(farm.id, {
      name: "F1", variety: "", plantingDate: "", areaHa: 0, region: "Midlands",
    });
    const manicaland = await useStore.getState().addField(farm.id, {
      name: "F2", variety: "", plantingDate: "", areaHa: 0, region: "Manicaland",
    });

    // These regions are well over a degree apart — jitter (±0.4) can't make them collide.
    const distance = Math.hypot(midlands.lat - manicaland.lat, midlands.lng - manicaland.lng);
    expect(distance).toBeGreaterThan(1);
  });
});
