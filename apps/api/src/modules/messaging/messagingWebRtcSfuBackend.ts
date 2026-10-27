const DEFAULT_PLANNED_MAX = 12;

export type MessagingWebRtcSfuBackendSnapshot = {
  /** Faz 17: medya hâlâ P2P mesh; SFU yalnızca yapılandırma + sağlık. */
  meshOnly: true;
  healthUrlConfigured: boolean;
  signalingUrlConfigured: boolean;
  plannedMaxParticipants: number;
  probe: {
    ok: boolean;
    source: "disabled" | "http_probe";
    checkedAt: string | null;
    detail?: string;
  };
};

function redactUrlForOps(url: string): string {
  try {
    const parsed = new URL(url);
    return `${parsed.protocol}//${parsed.host}${parsed.pathname}`;
  } catch {
    return "(invalid)";
  }
}

export function resolveMessagingWebRtcSfuHealthUrl(): string | null {
  const raw = process.env.MESSAGING_WEBRTC_SFU_HEALTH_URL?.trim();
  return raw && raw.length > 0 ? raw : null;
}

export function resolveMessagingWebRtcSfuSignalingUrl(): string | null {
  const raw = process.env.MESSAGING_WEBRTC_SFU_SIGNALING_URL?.trim();
  return raw && raw.length > 0 ? raw : null;
}

export function plannedMessagingWebRtcSfuMaxParticipants(): number {
  const raw = process.env.MESSAGING_WEBRTC_SFU_PLANNED_MAX_PARTICIPANTS?.trim();
  if (!raw) {
    return DEFAULT_PLANNED_MAX;
  }
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n >= 4 && n <= 50 ? n : DEFAULT_PLANNED_MAX;
}

export async function probeMessagingWebRtcSfuBackend(): Promise<MessagingWebRtcSfuBackendSnapshot> {
  const healthUrl = resolveMessagingWebRtcSfuHealthUrl();
  const signalingUrl = resolveMessagingWebRtcSfuSignalingUrl();
  const plannedMaxParticipants = plannedMessagingWebRtcSfuMaxParticipants();
  if (!healthUrl) {
    return {
      meshOnly: true,
      healthUrlConfigured: false,
      signalingUrlConfigured: Boolean(signalingUrl),
      plannedMaxParticipants,
      probe: {
        ok: false,
        source: "disabled",
        checkedAt: null,
        detail: signalingUrl
          ? `signaling_configured:${redactUrlForOps(signalingUrl)}`
          : "sfu_not_configured",
      },
    };
  }
  const checkedAt = new Date().toISOString();
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3500);
    const response = await fetch(healthUrl, {
      method: "GET",
      signal: controller.signal,
    });
    clearTimeout(timeout);
    const ok = response.ok;
    return {
      meshOnly: true,
      healthUrlConfigured: true,
      signalingUrlConfigured: Boolean(signalingUrl),
      plannedMaxParticipants,
      probe: {
        ok,
        source: "http_probe",
        checkedAt,
        detail: ok
          ? `health_ok:${redactUrlForOps(healthUrl)}`
          : `health_http_${response.status}`,
      },
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      meshOnly: true,
      healthUrlConfigured: true,
      signalingUrlConfigured: Boolean(signalingUrl),
      plannedMaxParticipants,
      probe: {
        ok: false,
        source: "http_probe",
        checkedAt,
        detail: `health_error:${message.slice(0, 120)}`,
      },
    };
  }
}
