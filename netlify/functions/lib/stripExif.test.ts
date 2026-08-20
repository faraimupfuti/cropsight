import { describe, it, expect } from "vitest";
import { stripJpegExif } from "./stripExif";

function u16be(n: number): Buffer {
  const b = Buffer.alloc(2);
  b.writeUInt16BE(n, 0);
  return b;
}

function makeSegment(markerByte: number, payload: Buffer): Buffer {
  return Buffer.concat([Buffer.from([0xff, markerByte]), u16be(2 + payload.length), payload]);
}

describe("stripJpegExif", () => {
  it("removes the EXIF APP1 segment while preserving other segments and scan data", () => {
    const soi = Buffer.from([0xff, 0xd8]);

    // APP0 (JFIF) — should be preserved
    const app0Payload = Buffer.from("JFIF\0\x01\x01\x00\x00\x01\x00\x01\x00\x00", "ascii");
    const app0 = makeSegment(0xe0, app0Payload);

    // APP1 (EXIF) — should be stripped
    const exifPayload = Buffer.concat([Buffer.from("Exif\0\0", "ascii"), Buffer.from([0x4d, 0x4d, 0x00, 0x2a, 0x00, 0x00, 0x00, 0x08])]);
    const app1 = makeSegment(0xe1, exifPayload);

    // SOS marker + arbitrary "entropy-coded" bytes + EOI — copied through verbatim, unparsed
    const scanAndTail = Buffer.from([0xff, 0xda, 0x00, 0x0c, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0x11, 0x22, 0x33, 0x44, 0xff, 0xd9]);

    const original = Buffer.concat([soi, app0, app1, scanAndTail]);
    const stripped = stripJpegExif(original);

    expect(stripped.includes("Exif")).toBe(false);
    expect(stripped.includes("JFIF")).toBe(true);
    expect(stripped.subarray(stripped.length - scanAndTail.length)).toEqual(scanAndTail);
    expect(stripped.length).toBe(original.length - app1.length);
  });

  it("returns non-JPEG buffers completely unchanged", () => {
    const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00]);
    expect(stripJpegExif(png)).toEqual(png);
  });

  it("returns the buffer unchanged when no EXIF segment is present", () => {
    const soi = Buffer.from([0xff, 0xd8]);
    const scanAndTail = Buffer.from([0xff, 0xda, 0x00, 0x02, 0x11, 0x22, 0xff, 0xd9]);
    const original = Buffer.concat([soi, scanAndTail]);
    expect(stripJpegExif(original)).toEqual(original);
  });

  it("does not strip an APP1 segment that isn't actually EXIF (e.g. XMP)", () => {
    const soi = Buffer.from([0xff, 0xd8]);
    const xmpPayload = Buffer.from("http://ns.adobe.com/xap/1.0/\0<xmp>fake</xmp>", "ascii");
    const app1Xmp = makeSegment(0xe1, xmpPayload);
    const scanAndTail = Buffer.from([0xff, 0xda, 0x00, 0x02, 0x11, 0xff, 0xd9]);
    const original = Buffer.concat([soi, app1Xmp, scanAndTail]);

    const stripped = stripJpegExif(original);
    expect(stripped).toEqual(original);
  });

  it("bails out safely (returns original) on a truncated/malformed buffer instead of corrupting it", () => {
    const soi = Buffer.from([0xff, 0xd8]);
    // Claims a segment length that exceeds the actual buffer size
    const brokenSegment = Buffer.from([0xff, 0xe1, 0xff, 0xff]); // length = 65535, way past EOF
    const original = Buffer.concat([soi, brokenSegment]);
    expect(stripJpegExif(original)).toEqual(original);
  });

  it("handles an empty or tiny buffer without throwing", () => {
    expect(() => stripJpegExif(Buffer.from([]))).not.toThrow();
    expect(() => stripJpegExif(Buffer.from([0xff]))).not.toThrow();
    expect(stripJpegExif(Buffer.from([]))).toEqual(Buffer.from([]));
  });
});
