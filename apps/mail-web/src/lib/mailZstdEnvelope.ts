import { decompress } from "fzstd";
import { decompressGzipBase64ToJson } from "./mailGzip";

export type ZstdBase64Envelope = {
  encoding: "zstd-base64";
  data: string;
};

export type GzipBase64Envelope = {
  encoding: "gzip-base64";
  data: string;
};

export function isZstdBase64Envelope(
  value: unknown,
): value is ZstdBase64Envelope {
  return (
    typeof value === "object" &&
    value !== null &&
    (value as ZstdBase64Envelope).encoding === "zstd-base64" &&
    typeof (value as ZstdBase64Envelope).data === "string"
  );
}

export function isGzipBase64Envelope(
  value: unknown,
): value is GzipBase64Envelope {
  return (
    typeof value === "object" &&
    value !== null &&
    (value as GzipBase64Envelope).encoding === "gzip-base64" &&
    typeof (value as GzipBase64Envelope).data === "string"
  );
}

function decompressZstdBase64ToUtf8(encoded: string): string {
  const binary = atob(encoded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  const out = decompress(bytes);
  return new TextDecoder().decode(out);
}

export async function unwrapLertaJsonEnvelope<T>(value: unknown): Promise<T> {
  if (isZstdBase64Envelope(value)) {
    const text = decompressZstdBase64ToUtf8(value.data);
    return JSON.parse(text) as T;
  }
  if (isGzipBase64Envelope(value)) {
    return decompressGzipBase64ToJson<T>(value.data);
  }
  return value as T;
}

/** @deprecated use unwrapLertaJsonEnvelope */
export function unwrapZstdEnvelope<T>(value: unknown): T {
  if (isZstdBase64Envelope(value)) {
    const text = decompressZstdBase64ToUtf8(value.data);
    return JSON.parse(text) as T;
  }
  return value as T;
}
