import type { Request } from "express";
import { compressJsonToZstdBase64 } from "./mailZstd.util";

export function isZstdBase64Envelope(
  value: unknown,
): value is { encoding: "zstd-base64"; data: string } {
  return (
    typeof value === "object" &&
    value !== null &&
    (value as { encoding?: string }).encoding === "zstd-base64" &&
    typeof (value as { data?: unknown }).data === "string"
  );
}

export function clientRequestedZstd(req: Pick<Request, "headers">): boolean {
  const raw = req.headers["x-lerta-encoding"];
  const value = Array.isArray(raw) ? raw[0] : raw;
  return value?.toLowerCase() === "zstd";
}

export async function maybeZstdJsonEnvelope(
  req: Pick<Request, "headers">,
  payload: unknown,
): Promise<unknown> {
  if (!clientRequestedZstd(req) || isZstdBase64Envelope(payload)) {
    return payload;
  }
  const json = JSON.stringify(payload);
  if (json.length < 512) {
    return payload;
  }
  const data = await compressJsonToZstdBase64(payload);
  return { encoding: "zstd-base64" as const, data };
}
