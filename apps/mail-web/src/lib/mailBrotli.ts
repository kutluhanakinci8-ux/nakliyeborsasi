/** Tarayıcıda Brotli açma (Compression Streams API). */

export function browserSupportsBrotliDecompression(): boolean {
  if (typeof DecompressionStream === "undefined") {
    return false;
  }
  try {
    new DecompressionStream("brotli" as CompressionFormat);
    return true;
  } catch {
    return false;
  }
}

export async function decompressBrotliBytes(
  data: Uint8Array,
): Promise<Uint8Array> {
  if (!browserSupportsBrotliDecompression()) {
    throw new Error("Brotli açma bu ortamda desteklenmiyor");
  }
  const ds = new DecompressionStream("brotli" as CompressionFormat);
  const chunk = new Uint8Array(data);
  const stream = new Blob([chunk]).stream().pipeThrough(ds);
  const ab = await new Response(stream).arrayBuffer();
  return new Uint8Array(ab);
}

export async function decompressBrotliBase64ToUtf8(
  encoded: string,
): Promise<string> {
  const binary = atob(encoded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  const out = await decompressBrotliBytes(bytes);
  return new TextDecoder().decode(out);
}

export async function decompressBrotliBase64ToJson<T>(
  encoded: string,
): Promise<T> {
  const text = await decompressBrotliBase64ToUtf8(encoded);
  return JSON.parse(text) as T;
}
