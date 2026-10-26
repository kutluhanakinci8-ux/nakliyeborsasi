"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { summarizeBrowserWebRtcSupport } from "@nakliyeborsasi/core";
import { formatWebRtcMediaError } from "../../lib/messagingWebRtcMediaErrors";
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

type PilotPhase =
  | "idle"
  | "outgoing"
  | "incoming"
  | "connected"
  | "ended"
  | "error";

function attachStreamToVideo(
  video: HTMLVideoElement | null,
  stream: MediaStream | null,
): void {
  if (!video || !stream) {
    return;
  }
  video.srcObject = stream;
  void video.play().catch(() => undefined);
}

export function MessagingWebRtcPilotCall({ accessToken, threadId }: Props) {
  const [enabled, setEnabled] = useState(false);
  const [phase, setPhase] = useState<PilotPhase>("idle");
  const [statusLine, setStatusLine] = useState("");
  const [error, setError] = useState("");
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [incomingOffer, setIncomingOffer] =
    useState<WebRtcSignalEnvelope | null>(null);
  const incomingOfferRef = useRef<WebRtcSignalEnvelope | null>(null);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const iceQueueRef = useRef<RTCIceCandidateInit[]>([]);
  const seenSignalIdsRef = useRef<Set<string>>(new Set());
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastPollIdRef = useRef<string | null>(null);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const browserReady = summarizeBrowserWebRtcSupport().ready;

  const stopPolling = useCallback(() => {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  }, []);

  const teardown = useCallback(() => {
    stopPolling();
    pcRef.current?.close();
    pcRef.current = null;
    iceQueueRef.current = [];
    setLocalStream((prev) => {
      prev?.getTracks().forEach((track) => track.stop());
      return null;
    });
    setRemoteStream(null);
    seenSignalIdsRef.current.clear();
    lastPollIdRef.current = null;
    incomingOfferRef.current = null;
    setIncomingOffer(null);
  }, [stopPolling]);

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
    attachStreamToVideo(localVideoRef.current, localStream);
  }, [localStream, phase]);

  useEffect(() => {
    attachStreamToVideo(remoteVideoRef.current, remoteStream);
  }, [remoteStream, phase]);

  const flushIceQueue = useCallback(async (pc: RTCPeerConnection) => {
    if (!pc.remoteDescription) {
      return;
    }
    while (iceQueueRef.current.length > 0) {
      const candidate = iceQueueRef.current.shift();
      if (candidate) {
        await pc.addIceCandidate(candidate);
      }
    }
  }, []);

  const ensurePeerConnection = useCallback(
    async (stream: MediaStream): Promise<RTCPeerConnection> => {
      if (pcRef.current) {
        return pcRef.current;
      }
      const config = await fetchMessagingWebRtcConfig(accessToken);
      const pc = new RTCPeerConnection({ iceServers: config.iceServers });
      pcRef.current = pc;
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));
      pc.ontrack = (event) => {
        const [incoming] = event.streams;
        if (incoming) {
          setRemoteStream(incoming);
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
      return pc;
    },
    [accessToken, threadId],
  );

  const acquireLocalMedia = useCallback(async (): Promise<MediaStream> => {
    return navigator.mediaDevices.getUserMedia({
      video: { facingMode: "user" },
      audio: true,
    });
  }, []);

  const processRemoteSignal = useCallback(
    async (signal: WebRtcSignalEnvelope) => {
      if (!threadId || seenSignalIdsRef.current.has(signal.id)) {
        return;
      }
      const pc = pcRef.current;
      if (!pc) {
        return;
      }
      seenSignalIdsRef.current.add(signal.id);
      lastPollIdRef.current = signal.id;

      try {
        if (signal.type === "answer") {
          const answer = JSON.parse(
            signal.payload,
          ) as RTCSessionDescriptionInit;
          await pc.setRemoteDescription(answer);
          await flushIceQueue(pc);
          setStatusLine("Karşı taraf yanıtı alındı");
        } else if (signal.type === "ice") {
          const candidate = JSON.parse(
            signal.payload,
          ) as RTCIceCandidateInit;
          if (pc.remoteDescription) {
            await pc.addIceCandidate(candidate);
          } else {
            iceQueueRef.current.push(candidate);
          }
        }
      } catch (err) {
        setPhase("error");
        setError(formatWebRtcMediaError(err));
      }
    },
    [flushIceQueue, threadId],
  );

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
            if (signal.type !== "offer") {
              continue;
            }
            if (seenSignalIdsRef.current.has(signal.id) || incomingOfferRef.current) {
              continue;
            }
            seenSignalIdsRef.current.add(signal.id);
            lastPollIdRef.current = signal.id;
            incomingOfferRef.current = signal;
            setIncomingOffer(signal);
            setPhase("incoming");
            setStatusLine("Gelen arama — kabul etmek için dokunun");
            return;
          }
        })
        .catch(() => undefined);
    }, 2500);
    return () => clearInterval(timer);
  }, [accessToken, enabled, phase, threadId]);

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
            void processRemoteSignal(signal);
          }
        })
        .catch(() => undefined);
    }, 2000);
  }, [accessToken, processRemoteSignal, threadId]);

  async function startCall(): Promise<void> {
    if (!threadId || !browserReady) {
      return;
    }
    setError("");
    teardown();
    setPhase("outgoing");
    setStatusLine("Kamera izni isteniyor…");
    try {
      const local = await acquireLocalMedia();
      setLocalStream(local);
      const pc = await ensurePeerConnection(local);
      setStatusLine("Aranıyor…");
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
      setError(formatWebRtcMediaError(err));
    }
  }

  async function acceptIncomingCall(): Promise<void> {
    if (!threadId || !incomingOffer || incomingOffer.type !== "offer") {
      return;
    }
    setError("");
    setStatusLine("Kamera izni isteniyor…");
    try {
      const local = await acquireLocalMedia();
      setLocalStream(local);
      const pc = await ensurePeerConnection(local);
      const offer = JSON.parse(
        incomingOffer.payload,
      ) as RTCSessionDescriptionInit;
      await pc.setRemoteDescription(offer);
      await flushIceQueue(pc);
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      await postMessagingWebRtcSignal(
        accessToken,
        threadId,
        "answer",
        JSON.stringify(answer),
      );
      incomingOfferRef.current = null;
      setIncomingOffer(null);
      setStatusLine("Bağlanıyor…");
      startPolling();
    } catch (err) {
      teardown();
      setPhase("error");
      setError(formatWebRtcMediaError(err));
    }
  }

  function declineIncomingCall(): void {
    incomingOfferRef.current = null;
    setIncomingOffer(null);
    setPhase("idle");
    setStatusLine("");
  }

  function endCall(): void {
    teardown();
    setPhase("ended");
    setStatusLine("Arama sonlandı");
  }

  if (!enabled || !threadId || !browserReady) {
    return null;
  }

  const showVideos =
    phase === "outgoing" || phase === "connected" || phase === "incoming";

  return (
    <div
      className="messaging-webrtc-pilot"
      role="region"
      aria-label="Pilot görüntülü arama"
    >
      <div className="messaging-webrtc-pilot-toolbar">
        {phase === "incoming" ? (
          <>
            <button
              type="button"
              className="messaging-webrtc-pilot-btn"
              onClick={() => void acceptIncomingCall()}
            >
              Gelen aramayı kabul et
            </button>
            <button
              type="button"
              className="messaging-webrtc-pilot-btn messaging-webrtc-pilot-btn--end"
              onClick={() => declineIncomingCall()}
            >
              Reddet
            </button>
          </>
        ) : phase === "idle" || phase === "ended" || phase === "error" ? (
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
      {showVideos ? (
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
