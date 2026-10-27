import { Injectable, Logger } from "@nestjs/common";
import {
  messagingVoiceSttConfigured,
  messagingVoiceSttMaxConcurrent,
  messagingVoiceSttAuthOptional,
  resolveMessagingVoiceSttApiKey,
  resolveMessagingVoiceSttApiUrl,
  resolveMessagingVoiceSttProvider,
} from "./messagingVoiceTranscribeConfig";
import { messagingVoiceSttActiveCount } from "./messagingVoiceSttConcurrency";
import { buildLocalWhisperAsrRequestUrl } from "./messagingVoiceSttLocalAsr";

/** Minimal valid WAV (silence) for STT reachability probe. */
const PROBE_WAV = Buffer.from(
  "UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=",
  "base64",
);

@Injectable()
export class MessagingVoiceSttHealthService {
  private readonly logger = new Logger(MessagingVoiceSttHealthService.name);

  public async probe(): Promise<{
    configured: boolean;
    provider: ReturnType<typeof resolveMessagingVoiceSttProvider>;
    reachable: boolean;
    latencyMs: number | null;
    activeJobs: number;
    maxConcurrent: number;
    error: string | null;
  }> {
    const configured = messagingVoiceSttConfigured();
    const provider = resolveMessagingVoiceSttProvider();
    const maxConcurrent = messagingVoiceSttMaxConcurrent();
    const activeJobs = messagingVoiceSttActiveCount();
    if (!configured) {
      return {
        configured: false,
        provider,
        reachable: false,
        latencyMs: null,
        activeJobs,
        maxConcurrent,
        error: "stt-unconfigured",
      };
    }
    const apiUrl = resolveMessagingVoiceSttApiUrl();
    if (!apiUrl) {
      return {
        configured: false,
        provider,
        reachable: false,
        latencyMs: null,
        activeJobs,
        maxConcurrent,
        error: "stt-unconfigured",
      };
    }
    const apiKey = resolveMessagingVoiceSttApiKey();
    if (!apiKey && !messagingVoiceSttAuthOptional()) {
      return {
        configured: false,
        provider,
        reachable: false,
        latencyMs: null,
        activeJobs,
        maxConcurrent,
        error: "stt-unconfigured",
      };
    }
    const started = Date.now();
    try {
      const form = new FormData();
      const headers: Record<string, string> = {};
      if (apiKey) {
        headers.Authorization = `Bearer ${apiKey}`;
      }
      let probeUrl = apiUrl;
      if (provider === "local") {
        probeUrl = buildLocalWhisperAsrRequestUrl(apiUrl);
        form.append(
          "audio_file",
          new Blob([PROBE_WAV], { type: "audio/wav" }),
          "probe.wav",
        );
      } else {
        form.append(
          "file",
          new Blob([PROBE_WAV], { type: "audio/wav" }),
          "probe.wav",
        );
        form.append("model", "base");
        form.append("response_format", "json");
      }
      const response = await fetch(probeUrl, {
        method: "POST",
        headers,
        body: form,
        signal: AbortSignal.timeout(15_000),
      });
      const latencyMs = Date.now() - started;
      const reachable = response.ok;
      if (!reachable) {
        const body = await response.text();
        this.logger.warn(
          `STT health probe status=${response.status} body=${body.slice(0, 120)}`,
        );
      }
      return {
        configured: true,
        provider,
        reachable,
        latencyMs,
        activeJobs,
        maxConcurrent,
        error: reachable ? null : "stt-error",
      };
    } catch (error) {
      const latencyMs = Date.now() - started;
      this.logger.warn(
        `STT health probe failed: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      return {
        configured: true,
        provider,
        reachable: false,
        latencyMs,
        activeJobs,
        maxConcurrent,
        error: "stt-error",
      };
    }
  }
}
