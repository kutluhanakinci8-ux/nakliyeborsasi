import { describe, expect, it } from "vitest";
import {
  compressJsonToBrotliBase64,
  decompressBrotliBase64ToJson,
} from "./mailBrotli.util";

describe("mailBrotli", () => {
  it("round-trips JSON via brotli base64", async () => {
    const payload = { items: Array.from({ length: 40 }, (_, i) => i) };
    const encoded = await compressJsonToBrotliBase64(payload);
    const decoded = await decompressBrotliBase64ToJson<typeof payload>(encoded);
    expect(decoded).toEqual(payload);
  });
});
