import { describe, it, expect } from "vitest";
import { validateImageFile } from "./mlClient";

function makeFile(name: string, type: string, sizeBytes: number): File {
  const blob = new Blob([new Uint8Array(sizeBytes)], { type });
  return new File([blob], name, { type });
}

describe("validateImageFile", () => {
  it("accepts a normal JPEG under the size limit", () => {
    const file = makeFile("leaf.jpg", "image/jpeg", 1_000_000);
    expect(validateImageFile(file)).toBeNull();
  });

  it("rejects unsupported file types", () => {
    const file = makeFile("leaf.gif", "image/gif", 1000);
    expect(validateImageFile(file)).toMatch(/JPEG, PNG, or WebP/);
  });

  it("rejects files over the size limit", () => {
    const file = makeFile("huge.jpg", "image/jpeg", 9_000_000);
    expect(validateImageFile(file)).toMatch(/8MB/);
  });

  it("accepts PNG and WebP", () => {
    expect(validateImageFile(makeFile("a.png", "image/png", 1000))).toBeNull();
    expect(validateImageFile(makeFile("a.webp", "image/webp", 1000))).toBeNull();
  });
});
