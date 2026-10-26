import { brotliCompress, brotliDecompress, constants } from "node:zlib";
import { promisify } from "node:util";

const brotliCompressAsync = promisify(brotliCompress);
const brotliDecompressAsync = promisify(brotliDecompress);

/** Sunucu tarafı Brotli (Node.js zlib) — Zstd desteklemeyen istemciler için ikinci seçenek. */
export async function compressUtf8ToBrotli(
  text: string,
  quality = 4,
): Promise<Buffer> {
  return brotliCompressAsync(Buffer.from(text, "utf8"), {
    params: {
      [constants.BROTLI_PARAM_QUALITY]: quality,
    },
  });
}

export async function decompressBrotliToUtf8(data: Buffer): Promise<string> {
  const out = await brotliDecompressAsync(data);
  return out.toString("utf8");
}

export async function compressJsonToBrotliBase64(
  value: unknown,
  quality = 4,
): Promise<string> {
  const buf = await compressUtf8ToBrotli(JSON.stringify(value), quality);
  return buf.toString("base64");
}

export async function decompressBrotliBase64ToJson<T>(
  encoded: string,
): Promise<T> {
  const text = await decompressBrotliToUtf8(Buffer.from(encoded, "base64"));
  return JSON.parse(text) as T;
}
