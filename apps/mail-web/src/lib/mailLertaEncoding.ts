import type { LertaJsonCompression } from "./mailLertaEncodingTypes";

let cached: LertaJsonCompression | null = null;

/** Zstd (fzstd) öncelikli; yüklenemezse zlib gzip yedek. */
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
  } catch {
    cached = "gzip";
  }
  return cached;
}
