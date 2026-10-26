import { gzip, gunzip } from "zlib";
import { promisify } from "node:util";

const gzipAsync = promisify(gzip);
const gunzipAsync = promisify(gunzip);

/** Sunucu tarafı gzip (Node zlib / DEFLATE) — Zstd desteklemeyen istemciler için yedek. */
export async function compressUtf8ToGzip(
  text: string,
  level = 6,
): Promise<Buffer> {
  return gzipAsync(Buffer.from(text, "utf8"), { level });
}

export async function decompressGzipToUtf8(data: Buffer): Promise<string> {
  const out = await gunzipAsync(data);
  return out.toString("utf8");
}

export async function compressJsonToGzipBase64(
  value: unknown,
  level = 6,
): Promise<string> {
  const buf = await compressUtf8ToGzip(JSON.stringify(value), level);
  return buf.toString("base64");
}

export async function decompressGzipBase64ToJson<T>(
  encoded: string,
): Promise<T> {
  const text = await decompressGzipToUtf8(Buffer.from(encoded, "base64"));
  return JSON.parse(text) as T;
}
