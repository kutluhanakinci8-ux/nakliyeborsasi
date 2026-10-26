"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { summarizeBrowserWebRtcSupport } from "@nakliyeborsasi/core";
import { fetchMessagingPublicStatus } from "../../lib/messagingPublicStatus";
import {
  fetchMessagingWebRtcConfig,
  pollMessagingWebRtcSignals,
  postMessagingWebRtcSignal,
  type WebRtcSignalEnvelope,
} from "../../lib/messagingWebRtcSignalingClient";

type Props = {
  accessToken: string;
  threadId: string | null;
};

type PilotPhase = "idle" | "ringing" | "connected" | "ended" | "error";

export function MessagingWebRtcPilotCall({ accessToken, threadId }: Props) {
  const [enabled, setEnabled] = useState(false);
  const [phase, setPhase] = useState<PilotPhase>("idle");
  const [statusLine, setStatusLine] = useState("");
  const [error, setError] = useState("");
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const seenSignalIdsRef = useRef<Set<string>>(new Set());
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastPollIdRef = useRef<string | null>(null);
  const browserReady = summarizeBrowserWebRtcSupport().ready;

  const teardown = useCallback(() => {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
    pcRef.current?.close();
    pcRef.current = null;
    localStreamRef.current?.getTracks().forEach((track) => track.stop());
    localStreamRef.current = null;
    seenSignalIdsRef.current.clear();
    lastPollIdRef.current = null;
  }, []);

  useEffect(() => {
    void fetchMessagingPublicStatus()
      .then((status) => {
        setEnabled(
          status.features.includes("messaging_webrtc_signaling_relay") &&
            status.webrtc?.signaling === "redis_relay",
        );
      })
      .catch(() => setEnabled(false));
    return () => teardown();
  }, [teardown]);

  useEffect(() => {
    if (phase !== "ringing" && phase !== "connected") {
      return;
    }
    const stream = localStreamRef.current;
    const el = localVideoRef.current;
    if (stream && el) {
      el.srcObject = stream;
    }
  }, [phase]);

  const handleRemoteSignal = useCallback(
    async (signal: WebRtcSignalEnvelope) => {
      if (!threadId || seenSignalIdsRef.current.has(signal.id)) {
        return;
      }
      seenSignalIdsRef.current.add(signal.id);
      lastPollIdRef.current = signal.id;

      let pc = pcRef.current;
      if (!pc) {
        const config = await fetchMessagingWebRtcConfig(accessToken);
        pc = new RTCPeerConnection({ iceServers: config.iceServers });
        pcRef.current = pc;
        pc.ontrack = (event) => {
          const [remoteStream] = event.streams;
          if (remoteVideoRef.current && remoteStream) {
            remoteVideoRef.current.srcObject = remoteStream;
          }
          setPhase("connected");
          setStatusLine("Bağlandı (pilot)");
        };
        pc.onicecandidate = (event) => {
          if (!event.candidate || !threadId) {
            return;
          }
          void postMessagingWebRtcSignal(
            accessToken,
            threadId,
            "ice",
            JSON.stringify(event.candidate),
          );
        };
        const local = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });
        localStreamRef.current = local;
        local.getTracks().forEach((track) => pc!.addTrack(track, local));
      }

      if (signal.type === "offer") {
        const offer = JSON.parse(signal.payload) as RTCSessionDescriptionInit;
        await pc.setRemoteDescription(offer);
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        await postMessagingWebRtcSignal(
          accessToken,
          threadId,
          "answer",
          JSON.stringify(answer),
        );
        setPhase("ringing");
        setStatusLine("Yanıt gönderildi…");
      } else if (signal.type === "answer") {
        const answer = JSON.parse(signal.payload) as RTCSessionDescriptionInit;
        await pc.setRemoteDescription(answer);
        setStatusLine("Karşı taraf yanıtı alındı");
      } else if (signal.type === "ice") {
        const candidate = JSON.parse(signal.payload) as RTCIceCandidateInit;
        await pc.addIceCandidate(candidate);
      }
    },
    [accessToken, threadId],
  );

  const startPolling = useCallback(() => {
    if (!threadId || pollTimerRef.current) {
      return;
    }
    pollTimerRef.current = setInterval(() => {
      void pollMessagingWebRtcSignals(
        accessToken,
        threadId,
        lastPollIdRef.current,
      )
        .then((signals) => {
          for (const signal of signals) {
            void handleRemoteSignal(signal);
          }
        })
        .catch(() => {
          /* yut — pilot */
        });
    }, 2000);
  }, [accessToken, threadId, handleRemoteSignal]);

  useEffect(() => {
    if (!enabled || !threadId || phase !== "idle") {
      return;
    }
    const timer = setInterval(() => {
      void pollMessagingWebRtcSignals(
        accessToken,
        threadId,
        lastPollIdRef.current,
      )
        .then((signals) => {
          for (const signal of signals) {
            if (signal.type !== "offer" || pcRef.current) {
              continue;
            }
            setPhase("ringing");
            setStatusLine("Gelen arama…");
            void handleRemoteSignal(signal);
            startPolling();
          }
        })
        .catch(() => undefined);
    }, 2500);
    return () => clearInterval(timer);
  }, [
    accessToken,
    enabled,
    handleRemoteSignal,
    phase,
    startPolling,
    threadId,
  ]);

  async function startCall(): Promise<void> {
    if (!threadId || !browserReady) {
      return;
    }
    setError("");
    teardown();
    setPhase("ringing");
    setStatusLine("Aranıyor…");
    try {
      const config = await fetchMessagingWebRtcConfig(accessToken);
      const pc = new RTCPeerConnection({ iceServers: config.iceServers });
      pcRef.current = pc;
      pc.ontrack = (event) => {
        const [remoteStream] = event.streams;
        if (remoteVideoRef.current && remoteStream) {
          remoteVideoRef.current.srcObject = remoteStream;
        }
        setPhase("connected");
        setStatusLine("Bağlandı (pilot)");
      };
      pc.onicecandidate = (event) => {
        if (!event.candidate) {
          return;
        }
        void postMessagingWebRtcSignal(
          accessToken,
          threadId,
          "ice",
          JSON.stringify(event.candidate),
        );
      };
      const local = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      localStreamRef.current = local;
      local.getTracks().forEach((track) => pc.addTrack(track, local));
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      await postMessagingWebRtcSignal(
        accessToken,
        threadId,
        "offer",
        JSON.stringify(offer),
      );
      startPolling();
    } catch (err) {
      teardown();
      setPhase("error");
      setError(err instanceof Error ? err.message : "Arama başlatılamadı");
    }
  }

  function endCall(): void {
    teardown();
    setPhase("ended");
    setStatusLine("Arama sonlandı");
  }

  if (!enabled || !threadId || !browserReady) {
    return null;
  }

  return (
    <div className="messaging-webrtc-pilot" role="region" aria-label="Pilot görüntülü arama">
      <div className="messaging-webrtc-pilot-toolbar">
        {phase === "idle" || phase === "ended" || phase === "error" ? (
          <button
            type="button"
            className="messaging-webrtc-pilot-btn"
            onClick={() => void startCall()}
          >
            Pilot görüntülü arama
          </button>
        ) : (
          <button
            type="button"
            className="messaging-webrtc-pilot-btn messaging-webrtc-pilot-btn--end"
            onClick={() => endCall()}
          >
            Aramayı bitir
          </button>
        )}
        {statusLine ? (
          <span className="messaging-webrtc-pilot-status">{statusLine}</span>
        ) : null}
        {error ? (
          <span className="messaging-webrtc-pilot-error" role="alert">
            {error}
          </span>
        ) : null}
      </div>
      {phase === "ringing" || phase === "connected" ? (
        <div className="messaging-webrtc-pilot-videos">
          <video
            ref={localVideoRef}
            className="messaging-webrtc-pilot-video messaging-webrtc-pilot-video--local"
            autoPlay
            muted
            playsInline
          />
          <video
            ref={remoteVideoRef}
            className="messaging-webrtc-pilot-video messaging-webrtc-pilot-video--remote"
            autoPlay
            playsInline
          />
        </div>
      ) : null}
    </div>
  );
}
