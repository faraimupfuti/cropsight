import { describe, it, expect } from "vitest";
import { fmtDate, fmtPct, toCSV } from "./format";

describe("fmtPct", () => {
  it("rounds to the nearest whole percent", () => {
    expect(fmtPct(0.913)).toBe("91%");
    expect(fmtPct(0.005)).toBe("1%");
    expect(fmtPct(0)).toBe("0%");
    expect(fmtPct(1)).toBe("100%");
  });
});

describe("fmtDate", () => {
  it("formats an ISO date as DD Mon YYYY", () => {
    expect(fmtDate("2026-06-15T10:00:00Z")).toBe("15 Jun 2026");
  });
});

describe("toCSV", () => {
  it("produces a header row plus one row per record", () => {
    const rows = [
      { name: "A", value: 1 },
      { name: "B", value: 2 },
    ];
    const csv = toCSV(rows, ["name", "value"]);
    const lines = csv.split("\n");
    expect(lines).toHaveLength(3);
    expect(lines[0]).toBe("name,value");
    expect(lines[1]).toBe('"A","1"');
  });

  it("escapes embedded quotes and commas", () => {
    const rows = [{ note: 'contains "quotes", and a comma' }];
    const csv = toCSV(rows, ["note"]);
    expect(csv).toContain('"contains ""quotes"", and a comma"');
  });

  it("handles missing fields as empty strings rather than throwing", () => {
    const rows = [{ a: "x" } as any];
    const csv = toCSV(rows, ["a", "b"]);
    expect(csv.split("\n")[1]).toBe('"x",""');
  });
});
