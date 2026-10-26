import type { Request } from "express";
import { compressJsonToBrotliBase64 } from "./mailBrotli.util";
import { compressJsonToGzipBase64 } from "./mailGzip.util";
import { compressJsonToZstdBase64 } from "./mailZstd.util";

export type LertaJsonCompression = "zstd" | "br" | "gzip";

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

export function isGzipBase64Envelope(
  value: unknown,
): value is { encoding: "gzip-base64"; data: string } {
  return (
    typeof value === "object" &&
    value !== null &&
    (value as { encoding?: string }).encoding === "gzip-base64" &&
    typeof (value as { data?: unknown }).data === "string"
  );
}

export function isBrotliBase64Envelope(
  value: unknown,
): value is { encoding: "brotli-base64"; data: string } {
  return (
    typeof value === "object" &&
    value !== null &&
    (value as { encoding?: string }).encoding === "brotli-base64" &&
    typeof (value as { data?: unknown }).data === "string"
  );
}

export function parseClientLertaEncoding(
  req: Pick<Request, "headers">,
): LertaJsonCompression | null {
  const raw = req.headers["x-lerta-encoding"];
  const value = (Array.isArray(raw) ? raw[0] : raw)?.toLowerCase();
  if (value === "zstd") {
    return "zstd";
  }
  if (value === "gzip") {
    return "gzip";
  }
  if (value === "br") {
    return "br";
  }
  return null;
}

/** @deprecated use parseClientLertaEncoding */
export function clientRequestedZstd(req: Pick<Request, "headers">): boolean {
  return parseClientLertaEncoding(req) === "zstd";
}

function shouldCompressWrap(data: unknown): boolean {
  if (data === null || data === undefined) {
    return false;
  }
  const t = typeof data;
  if (t !== "object") {
    return false;
  }
  if (Buffer.isBuffer(data)) {
    return false;
  }
  if (
    isZstdBase64Envelope(data) ||
    isGzipBase64Envelope(data) ||
    isBrotliBase64Envelope(data)
  ) {
    return false;
  }
  return true;
}

const MIN_JSON_BYTES = 512;

export async function maybeCompressJsonEnvelope(
  req: Pick<Request, "headers">,
  payload: unknown,
): Promise<unknown> {
  const mode = parseClientLertaEncoding(req);
  if (!mode || !shouldCompressWrap(payload)) {
    return payload;
  }
  const json = JSON.stringify(payload);
  if (json.length < MIN_JSON_BYTES) {
    return payload;
  }
  if (mode === "zstd") {
    const data = await compressJsonToZstdBase64(payload);
    return { encoding: "zstd-base64" as const, data };
  }
  if (mode === "br") {
    const data = await compressJsonToBrotliBase64(payload);
    return { encoding: "brotli-base64" as const, data };
  }
  const data = await compressJsonToGzipBase64(payload);
  return { encoding: "gzip-base64" as const, data };
}

/** @deprecated use maybeCompressJsonEnvelope */
export async function maybeZstdJsonEnvelope(
  req: Pick<Request, "headers">,
  payload: unknown,
): Promise<unknown> {
  return maybeCompressJsonEnvelope(req, payload);
}
