export type MessagingWebRtcTurnMonitorSnapshot = {
  enabled: boolean;
  ok: boolean;
  source: "disabled" | "env_hint" | "http_probe";
  activeAllocationsHint: number | null;
  checkedAt: string | null;
  detail?: string;
};

function envAllocationsHint(): number | null {
  const raw = process.env.MESSAGING_WEBRTC_TURN_ALLOCATIONS_HINT?.trim();
  if (!raw) {
    return null;
  }
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

export function enrichTurnMonitorWithIceCaps(
  monitor: MessagingWebRtcTurnMonitorSnapshot,
  turnCredentialsConfigured: boolean,
): MessagingWebRtcTurnMonitorSnapshot {
  if (monitor.enabled) {
    return monitor;
  }
  if (!turnCredentialsConfigured) {
    return monitor;
  }
  const hint = envAllocationsHint();
  return {
    enabled: true,
    ok: true,
    source: "env_hint",
    activeAllocationsHint: hint,
    checkedAt: new Date().toISOString(),
    detail: "turn_in_ice_servers",
  };
}

export async function probeMessagingWebRtcTurnMonitor(): Promise<MessagingWebRtcTurnMonitorSnapshot> {
  const url = process.env.MESSAGING_WEBRTC_TURN_METRICS_URL?.trim();
  const hint = envAllocationsHint();
  if (!url) {
    if (hint !== null) {
      return {
        enabled: true,
        ok: true,
        source: "env_hint",
        activeAllocationsHint: hint,
        checkedAt: new Date().toISOString(),
        detail: "MESSAGING_WEBRTC_TURN_ALLOCATIONS_HINT",
      };
    }
    return {
      enabled: false,
      ok: false,
      source: "disabled",
      activeAllocationsHint: null,
      checkedAt: null,
    };
  }
  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(2500),
      headers: { Accept: "application/json" },
    });
    if (!response.ok) {
      return {
        enabled: true,
        ok: false,
        source: "http_probe",
        activeAllocationsHint: hint,
        checkedAt: new Date().toISOString(),
        detail: `HTTP ${response.status}`,
      };
    }
    const body = (await response.json()) as {
      activeAllocations?: number;
      allocations?: number;
      ok?: boolean;
    };
    const active =
      typeof body.activeAllocations === "number"
        ? body.activeAllocations
        : typeof body.allocations === "number"
          ? body.allocations
          : hint;
    return {
      enabled: true,
      ok: body.ok !== false,
      source: "http_probe",
      activeAllocationsHint: active,
      checkedAt: new Date().toISOString(),
    };
  } catch (error) {
    return {
      enabled: true,
      ok: false,
      source: "http_probe",
      activeAllocationsHint: hint,
      checkedAt: new Date().toISOString(),
      detail: error instanceof Error ? error.message : "?",
    };
  }
}
