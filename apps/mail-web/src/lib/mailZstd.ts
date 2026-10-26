/**
 * Zstandard sıkıştırma — yalnızca istemci (çevrimdışı önbellek).
 * API: apps/api/src/common/mailZstd.util.ts
 */
import { compressBytesWithZstd } from "./mailZstdCodec";
import { decompress } from "fzstd";

export async function compressUtf8ToZstd(text: string): Promise<Uint8Array> {
  return compressBytesWithZstd(new TextEncoder().encode(text), 3);
}

export function decompressZstdToUtf8(data: Uint8Array): string {
  const out = decompress(data);
  return new TextDecoder().decode(out);
}

export async function compressJsonToZstdBase64(value: unknown): Promise<string> {
  const compressed = await compressUtf8ToZstd(JSON.stringify(value));
  let binary = "";
  for (let i = 0; i < compressed.length; i++) {
    binary += String.fromCharCode(compressed[i]);
  }
  return btoa(binary);
}

export function decompressZstdBase64ToJson<T>(encoded: string): T {
  const binary = atob(encoded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  const text = decompressZstdToUtf8(bytes);
  return JSON.parse(text) as T;
}
