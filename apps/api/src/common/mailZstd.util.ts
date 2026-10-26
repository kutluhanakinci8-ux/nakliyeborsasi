import { compress, decompress } from "@mongodb-js/zstd";

/** Sunucu tarafı Zstandard (libzstd) — posta önbelleği ve büyük JSON yanıtları. */
export async function compressUtf8ToZstd(
  text: string,
  level = 3,
): Promise<Buffer> {
  return compress(Buffer.from(text, "utf8"), level);
}

export async function decompressZstdToUtf8(data: Buffer): Promise<string> {
  const out = await decompress(data);
  return out.toString("utf8");
}

export async function compressJsonToZstdBase64(
  value: unknown,
  level = 3,
): Promise<string> {
  const buf = await compressUtf8ToZstd(JSON.stringify(value), level);
  return buf.toString("base64");
}

export async function decompressZstdBase64ToJson<T>(
  encoded: string,
): Promise<T> {
  const text = await decompressZstdToUtf8(Buffer.from(encoded, "base64"));
  return JSON.parse(text) as T;
}
