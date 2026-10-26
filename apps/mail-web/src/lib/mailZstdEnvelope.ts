import { decompress } from "fzstd";

export type ZstdBase64Envelope = {
  encoding: "zstd-base64";
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

function decompressZstdBase64ToUtf8(encoded: string): string {
  const binary = atob(encoded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  const out = decompress(bytes);
  return new TextDecoder().decode(out);
}

export function unwrapZstdEnvelope<T>(value: unknown): T {
  if (isZstdBase64Envelope(value)) {
    const text = decompressZstdBase64ToUtf8(value.data);
    return JSON.parse(text) as T;
  }
  return value as T;
}
