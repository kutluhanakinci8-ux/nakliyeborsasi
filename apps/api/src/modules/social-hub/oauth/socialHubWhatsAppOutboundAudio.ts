import { execFile } from "node:child_process";
import { randomBytes } from "node:crypto";
import { readFile, unlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

function resolveFfmpegBinary(): string {
  const fromEnv = process.env.FFMPEG_PATH?.trim();
  if (fromEnv) {
    return fromEnv;
  }
  return "ffmpeg";
}

/** Meta WhatsApp Cloud API — upload `type` için izinli ses MIME'ları. */
export const WHATSAPP_CLOUD_ALLOWED_AUDIO_MIME = new Set([
  "audio/aac",
  "audio/mp4",
  "audio/mpeg",
  "audio/amr",
  "audio/ogg",
  "audio/opus",
]);

export function normalizeAudioMimeType(contentType: string): string {
  return contentType.split(";")[0]?.trim().toLowerCase() || "application/octet-stream";
}

export function isWhatsAppCloudAllowedAudioMime(contentType: string): boolean {
  return WHATSAPP_CLOUD_ALLOWED_AUDIO_MIME.has(normalizeAudioMimeType(contentType));
}

export type WhatsAppPreparedAudio = {
  buffer: Buffer;
  contentType: string;
  filename: string;
  transcoded: boolean;
};

async function runFfmpeg(args: string[]): Promise<void> {
  await execFileAsync(resolveFfmpegBinary(), args, {
    timeout: 120_000,
    maxBuffer: 8 * 1024 * 1024,
  });
}

async function transcodeToOggOpus(
  inputBuffer: Buffer,
  inputExt: string,
): Promise<Buffer | null> {
  const id = randomBytes(8).toString("hex");
  const inPath = join(tmpdir(), `wa-audio-in-${id}.${inputExt}`);
  const outPath = join(tmpdir(), `wa-audio-out-${id}.ogg`);
  const ffmpeg = resolveFfmpegBinary();
  try {
    await writeFile(inPath, inputBuffer);
    const attempts: string[][] = [
      [
        "-hide_banner",
        "-loglevel",
        "error",
        "-y",
        "-i",
        inPath,
        "-c:a",
        "copy",
        outPath,
      ],
      [
        "-hide_banner",
        "-loglevel",
        "error",
        "-y",
        "-i",
        inPath,
        "-c:a",
        "libopus",
        "-b:a",
        "32k",
        outPath,
      ],
    ];
    for (const extra of attempts) {
      await unlink(outPath).catch(() => undefined);
      try {
        await runFfmpeg(extra);
        const out = await readFile(outPath);
        if (out.length > 0) {
          return out;
        }
      } catch {
        // next strategy
      }
    }
    return null;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!message.includes("ENOENT")) {
      console.warn(
        `[whatsapp-audio] ffmpeg transcode failed (${ffmpeg}): ${message}`,
      );
    }
    return null;
  } finally {
    await unlink(inPath).catch(() => undefined);
    await unlink(outPath).catch(() => undefined);
  }
}

function extensionForMime(mime: string, filename: string): string {
  const base = filename.includes(".") ? filename.split(".").pop()! : "";
  if (base) {
    return base.toLowerCase();
  }
  if (mime.includes("webm")) {
    return "webm";
  }
  if (mime.includes("ogg") || mime.includes("opus")) {
    return "ogg";
  }
  if (mime.includes("mpeg") || mime === "audio/mp3") {
    return "mp3";
  }
  if (mime.includes("mp4") || mime.includes("aac")) {
    return "m4a";
  }
  return "bin";
}

/**
 * Tarayıcı sesli mesajları (audio/webm) WhatsApp yükleme formatına çevirir.
 */
export async function prepareWhatsAppOutboundAudio(params: {
  buffer: Buffer;
  contentType: string;
  filename: string;
}): Promise<WhatsAppPreparedAudio> {
  const mime = normalizeAudioMimeType(params.contentType);
  if (isWhatsAppCloudAllowedAudioMime(mime)) {
    const name =
      params.filename.toLowerCase().endsWith(".ogg") ||
      params.filename.toLowerCase().endsWith(".opus") ||
      !params.filename.includes(".")
        ? params.filename.includes(".")
          ? params.filename
          : `voice.${mime === "audio/opus" ? "opus" : "ogg"}`
        : params.filename;
    return {
      buffer: params.buffer,
      contentType: mime,
      filename: name,
      transcoded: false,
    };
  }
  if (!mime.startsWith("audio/")) {
    return {
      buffer: params.buffer,
      contentType: mime,
      filename: params.filename,
      transcoded: false,
    };
  }
  const ext = extensionForMime(mime, params.filename);
  const ogg = await transcodeToOggOpus(params.buffer, ext);
  if (ogg) {
    const outName = params.filename.replace(/\.[^.]+$/, "") || "sesli-mesaj";
    return {
      buffer: ogg,
      contentType: "audio/ogg",
      filename: `${outName}.ogg`,
      transcoded: true,
    };
  }
  return {
    buffer: params.buffer,
    contentType: mime,
    filename: params.filename,
    transcoded: false,
  };
}
