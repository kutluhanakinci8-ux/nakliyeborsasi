/**
 * Zstandard — istemci tarafında açma (fzstd / libzstd).
 * Sıkıştırma sunucuda @mongodb-js/zstd ile yapılır (apps/api).
 */
import { decompress } from "fzstd";

export function decompressZstdToUtf8(data: Uint8Array): string {
  const out = decompress(data);
  return new TextDecoder().decode(out);
}

export function decompressZstdBase64ToUtf8(encoded: string): string {
  const binary = atob(encoded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return decompressZstdToUtf8(bytes);
}

export function decompressZstdBase64ToJson<T>(encoded: string): T {
  const text = decompressZstdBase64ToUtf8(encoded);
  return JSON.parse(text) as T;
}
