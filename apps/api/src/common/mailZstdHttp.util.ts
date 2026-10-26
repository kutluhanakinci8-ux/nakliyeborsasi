import type { Request } from "express";
import { compressJsonToZstdBase64 } from "./mailZstd.util";

export function clientRequestedZstd(req: Pick<Request, "headers">): boolean {
  const raw = req.headers["x-lerta-encoding"];
  const value = Array.isArray(raw) ? raw[0] : raw;
  return value?.toLowerCase() === "zstd";
}

export async function maybeZstdJsonEnvelope(
  req: Pick<Request, "headers">,
  payload: unknown,
): Promise<unknown> {
  if (!clientRequestedZstd(req)) {
    return payload;
  }
  const data = await compressJsonToZstdBase64(payload);
  return { encoding: "zstd-base64" as const, data };
}
