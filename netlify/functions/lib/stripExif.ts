/**
 * Strips the EXIF (APP1) segment from a JPEG buffer, if present.
 *
 * Why this exists: phone cameras commonly embed GPS coordinates in EXIF
 * metadata. A field's registered location and the exact spot a photo was
 * taken can differ — and retaining that raw metadata is a privacy
 * question separate from (and outside the control of) the field's
 * registered coordinates. This strips it before the image is ever
 * persisted to storage.
 *
 * Deliberately dependency-free (no `sharp`/native bindings) so it's cheap
 * to bundle into a Netlify Function and has no platform-binary risk.
 *
 * Scope: JPEG only, since that's what phone cameras produce and where the
 * GPS-in-EXIF risk actually lives. PNG/WebP can carry similar metadata in
 * principle but far less commonly do for phone photos — not handled here;
 * documented as a known gap.
 *
 * Safety: this function is deliberately conservative. Any sign the buffer
 * doesn't parse as well-formed JPEG segments causes it to bail out and
 * return the ORIGINAL buffer unchanged, rather than risk corrupting the
 * image. Stripping EXIF is a nice-to-have; a broken photo is not
 * acceptable, so correctness of the image always wins.
 */
export function stripJpegExif(buffer: Buffer): Buffer {
  if (buffer.length < 4 || buffer[0] !== 0xff || buffer[1] !== 0xd8) {
    return buffer; // not a JPEG (no SOI marker) — leave untouched
  }

  const segments: Buffer[] = [Buffer.from([0xff, 0xd8])];
  let offset = 2;

  while (offset < buffer.length) {
    if (offset + 1 >= buffer.length || buffer[offset] !== 0xff) {
      // Malformed relative to our assumptions — bail out safely.
      return buffer;
    }
    const marker = buffer[offset + 1];

    // Start of Scan: everything from here to EOF is scan-header +
    // entropy-coded data (no simple length field) — copy through as-is.
    if (marker === 0xda) {
      segments.push(buffer.subarray(offset));
      return Buffer.concat(segments);
    }

    // Markers with no payload/length field: SOI, EOI, TEM, RSTn.
    if (marker === 0xd8 || marker === 0xd9 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
      segments.push(buffer.subarray(offset, offset + 2));
      offset += 2;
      continue;
    }

    if (offset + 4 > buffer.length) return buffer; // truncated — bail safely
    const segmentLength = buffer.readUInt16BE(offset + 2); // includes the 2 length bytes, excludes the marker bytes
    const segmentEnd = offset + 2 + segmentLength;
    if (segmentLength < 2 || segmentEnd > buffer.length) return buffer; // truncated/invalid — bail safely

    const isApp1 = marker === 0xe1;
    const payloadStart = offset + 4;
    const isExif = isApp1 && segmentLength >= 8 && buffer.subarray(payloadStart, payloadStart + 4).toString("ascii") === "Exif";

    if (!isExif) {
      segments.push(buffer.subarray(offset, segmentEnd));
    }
    // else: this is the EXIF segment — omit it from the output entirely.

    offset = segmentEnd;
  }

  // Fell off the end without ever hitting SOS — return whatever we
  // reconstructed (shouldn't normally happen for a valid JPEG).
  return Buffer.concat(segments);
}
