/** Tarayıcıda gzip açma (zlib/DEFLATE — DecompressionStream). */

export async function decompressGzipBytes(data: Uint8Array): Promise<Uint8Array> {
  if (typeof DecompressionStream === "undefined") {
    throw new Error("gzip açma bu ortamda desteklenmiyor");
  }
  const ds = new DecompressionStream("gzip");
  const chunk = new Uint8Array(data);
  const stream = new Blob([chunk]).stream().pipeThrough(ds);
  const ab = await new Response(stream).arrayBuffer();
  return new Uint8Array(ab);
}

export async function decompressGzipBase64ToUtf8(encoded: string): Promise<string> {
  const binary = atob(encoded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  const out = await decompressGzipBytes(bytes);
  return new TextDecoder().decode(out);
}

export async function decompressGzipBase64ToJson<T>(encoded: string): Promise<T> {
  const text = await decompressGzipBase64ToUtf8(encoded);
  return JSON.parse(text) as T;
}
