import { AppState, type AppStateStatus } from "react-native";
import type { NativeMeshPilotSession } from "./lertaMobileNativeMeshPilotApi";
import {
  rnMeshJoinRoom,
  rnMeshLeaveRoom,
  rnMeshPollSignals,
  rnMeshPostSignal,
  type RnMeshSignalEnvelope,
} from "./lertaMobileRnMeshSignalingClient";
import {
  readLertaRnWebRtcGlobal,
  type RnMediaStream,
  type RnPeerConnection,
} from "./lertaMobileRnWebRtcGlobal";

const POLL_MS = 900;

export type NativeRnMeshRunState = {
  phase: "idle" | "signaling" | "media" | "error" | "background";
  lastSignalType: string | null;
  peerCount: number;
  message: string;
  backgroundPaused: boolean;
  hasRemoteVideo: boolean;
  remoteStreamUrl: string | null;
};

export type NativeRnMeshRunner = {
  stop: () => void;
};

export function startNativeRnMeshMediaPilot(params: {
  accessToken: string;
  threadId: string;
  pilotSession: NativeMeshPilotSession;
  currentUserId: string;
  onUpdate: (state: NativeRnMeshRunState) => void;
}): NativeRnMeshRunner {
  let stopped = false;
  let pollTimer: ReturnType<typeof setInterval> | null = null;
  let lastSignalId: string | null = null;
  let appBackground = false;
  const pcs = new Map<string, RnPeerConnection>();
  let localStream: RnMediaStream | null = null;

  const iceServers = params.pilotSession.iceServers?.map((entry) => ({
    urls: entry.urls,
  }));

  function baseState(): NativeRnMeshRunState {
    return {
      phase: "signaling",
      lastSignalType: null,
      peerCount: 0,
      message: "",
      backgroundPaused: appBackground,
      hasRemoteVideo: false,
      remoteStreamUrl: null,
    };
  }

  function update(partial: Partial<NativeRnMeshRunState>): void {
    params.onUpdate({ ...baseState(), ...partial });
  }

  const appSub = AppState.addEventListener("change", (next: AppStateStatus) => {
    appBackground = next !== "active";
    if (appBackground) {
      update({
        phase: "background",
        message: "Arka plan: sinyal poll duraklatıldı.",
        backgroundPaused: true,
      });
    } else {
      update({
        phase: "media",
        message: "Ön plan: sinyal poll devam ediyor.",
        backgroundPaused: false,
      });
    }
  });

  async function ensurePc(peerId: string): Promise<RnPeerConnection | null> {
    const rtc = readLertaRnWebRtcGlobal();
    if (!rtc) {
      return null;
    }
    let pc = pcs.get(peerId);
    if (pc) {
      return pc;
    }
    pc = new rtc.RTCPeerConnection({ iceServers });
    pc.onicecandidate = (ev) => {
      if (!ev.candidate) {
        return;
      }
      void rnMeshPostSignal(
        params.accessToken,
        params.threadId,
        "ice",
        JSON.stringify(ev.candidate),
        peerId,
      ).catch(() => undefined);
    };
    pc.ontrack = (ev) => {
      const stream = ev.streams[0];
      const url = stream?.toURL?.() ?? null;
      update({
        phase: "media",
        hasRemoteVideo: Boolean(url),
        remoteStreamUrl: url,
        message: url ? "Uzak video akışı alındı (RTCView)." : "Uzak track alındı.",
      });
    };
    if (localStream) {
      for (const track of localStream.getTracks()) {
        pc.addTrack(track, localStream);
      }
    }
    pcs.set(peerId, pc);
    return pc;
  }

  async function handleSignal(signal: RnMeshSignalEnvelope): Promise<void> {
    update({ lastSignalType: signal.type });
    const rtc = readLertaRnWebRtcGlobal();
    if (!rtc) {
      return;
    }
    const peerId = signal.fromUserId;
    if (signal.targetUserId && signal.targetUserId !== params.currentUserId) {
      return;
    }
    const pc = await ensurePc(peerId);
    if (!pc) {
      return;
    }
    if (signal.type === "offer") {
      const desc = JSON.parse(signal.payload) as { type: string; sdp?: string };
      await pc.setRemoteDescription(desc);
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      await rnMeshPostSignal(
        params.accessToken,
        params.threadId,
        "answer",
        JSON.stringify(answer),
        peerId,
      );
      update({ phase: "media", message: "Offer/answer tamamlandı." });
    } else if (signal.type === "answer") {
      const desc = JSON.parse(signal.payload) as { type: string; sdp?: string };
      await pc.setRemoteDescription(desc);
      update({ phase: "media", message: "Answer işlendi." });
    } else if (signal.type === "ice") {
      const candidate = JSON.parse(signal.payload) as unknown;
      await pc.addIceCandidate(candidate);
    }
  }

  void (async () => {
    try {
      update({ phase: "signaling", message: "Odaya katılılıyor…" });
      const room = await rnMeshJoinRoom(params.accessToken, params.threadId);
      const others = room.participants
        .map((p) => p.userId)
        .filter((id) => id !== params.currentUserId);
      update({
        peerCount: room.participants.length,
        message: `Oda: ${room.participants.length} katılımcı`,
      });
      const rtc = readLertaRnWebRtcGlobal();
      if (rtc) {
        localStream = await rtc.mediaDevices.getUserMedia({
          audio: true,
          video: true,
        });
        update({ phase: "media", message: "Yerel medya açıldı." });
        for (const peerId of others) {
          const pc = await ensurePc(peerId);
          if (!pc) {
            continue;
          }
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          await rnMeshPostSignal(
            params.accessToken,
            params.threadId,
            "offer",
            JSON.stringify(offer),
            peerId,
          );
        }
      } else {
        update({
          message:
            "Sinyal modu: global.LertaRnWebRTC yok — yalnızca poll (medya kapalı).",
        });
      }
      await rnMeshPostSignal(
        params.accessToken,
        params.threadId,
        "invite",
        JSON.stringify({
          media: "video",
          pilot: params.pilotSession.pilotSessionId,
        }),
        null,
      );
      pollTimer = setInterval(() => {
        if (stopped || appBackground) {
          return;
        }
        void rnMeshPollSignals(
          params.accessToken,
          params.threadId,
          lastSignalId,
        )
          .then(async (signals) => {
            for (const signal of signals) {
              lastSignalId = signal.id;
              await handleSignal(signal);
            }
            if (signals.length > 0) {
              update({
                message: `Son sinyal: ${signals[signals.length - 1]?.type ?? "—"}`,
              });
            }
          })
          .catch(() => {
            update({ phase: "error", message: "Sinyal poll hatası" });
          });
      }, POLL_MS);
    } catch (err) {
      update({
        phase: "error",
        message: err instanceof Error ? err.message : "Mesh başlatılamadı",
      });
    }
  })();

  return {
    stop: () => {
      stopped = true;
      appSub.remove();
      if (pollTimer) {
        clearInterval(pollTimer);
      }
      for (const pc of pcs.values()) {
        pc.close();
      }
      pcs.clear();
      localStream?.getTracks().forEach((t) => t.stop());
      void rnMeshLeaveRoom(params.accessToken, params.threadId).catch(
        () => undefined,
      );
    },
  };
}
