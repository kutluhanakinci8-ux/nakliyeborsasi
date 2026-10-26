import type { LertaJsonCompression } from "./mailLertaEncodingTypes";

let cached: LertaJsonCompression | null = null;

import { browserSupportsBrotliDecompression } from "./mailBrotli";

/** Zstd öncelikli; sonra Brotli; son çare gzip (zlib). */
export async function resolveMailApiLertaEncoding(): Promise<LertaJsonCompression> {
  if (cached) {
    return cached;
  }
  if (typeof window === "undefined") {
    cached = "gzip";
    return cached;
  }
  try {
    await import("./mailZstdCodec");
    cached = "zstd";
    return cached;
  } catch {
    // continue
  }
  if (browserSupportsBrotliDecompression()) {
    cached = "br";
    return cached;
  }
  cached = "gzip";
  return cached;
}
