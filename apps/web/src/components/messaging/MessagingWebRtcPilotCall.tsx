"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { summarizeBrowserWebRtcSupport } from "@nakliyeborsasi/core";
import { formatWebRtcMediaError } from "../../lib/messagingWebRtcMediaErrors";
import { fetchMessagingPublicStatus } from "../../lib/messagingPublicStatus";
import {
  fetchMessagingWebRtcConfig,
  fetchMessagingWebRtcRoom,
  joinMessagingWebRtcRoom,
  leaveMessagingWebRtcRoom,
  pollMessagingWebRtcSignals,
  postMessagingWebRtcSignal,
  type WebRtcSignalEnvelope,
} from "../../lib/messagingWebRtcSignalingClient";

const MAX_PARTICIPANTS = 3;

type Props = {
  accessToken: string;
  threadId: string | null;
  currentUserId: string | null;
};

type PilotPhase =
  | "idle"
  | "outgoing"
  | "incoming"
  | "connected"
  | "ended"
  | "error";

type RemotePeer = {
  userId: string;
  stream: MediaStream;
};

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

export function MessagingWebRtcPilotCall({
  accessToken,
  threadId,
  currentUserId,
}: Props) {
  const [enabled, setEnabled] = useState(false);
  const [phase, setPhase] = useState<PilotPhase>("idle");
  const [statusLine, setStatusLine] = useState("");
  const [error, setError] = useState("");
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remotePeers, setRemotePeers] = useState<RemotePeer[]>([]);
  const [incomingOffer, setIncomingOffer] =
    useState<WebRtcSignalEnvelope | null>(null);
  const incomingOfferRef = useRef<WebRtcSignalEnvelope | null>(null);

  const pcsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const iceQueuesRef = useRef<Map<string, RTCIceCandidateInit[]>>(new Map());
  const seenSignalIdsRef = useRef<Set<string>>(new Set());
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastPollIdRef = useRef<string | null>(null);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const inCallRef = useRef(false);
  const browserReady = summarizeBrowserWebRtcSupport().ready;

  const stopPolling = useCallback(() => {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  }, []);

  const setRemoteForPeer = useCallback((userId: string, stream: MediaStream) => {
    setRemotePeers((prev) => {
      const rest = prev.filter((p) => p.userId !== userId);
      const next = [...rest, { userId, stream }];
      setStatusLine(
        `Bağlı (${Math.min(next.length + 1, MAX_PARTICIPANTS)}/${MAX_PARTICIPANTS})`,
      );
      return next;
    });
    setPhase("connected");
  }, []);

  const teardown = useCallback(() => {
    stopPolling();
    inCallRef.current = false;
    for (const pc of pcsRef.current.values()) {
      pc.close();
    }
    pcsRef.current.clear();
    iceQueuesRef.current.clear();
    setLocalStream((prev) => {
      prev?.getTracks().forEach((track) => track.stop());
      return null;
    });
    localStreamRef.current = null;
    setRemotePeers([]);
    seenSignalIdsRef.current.clear();
    lastPollIdRef.current = null;
    incomingOfferRef.current = null;
    setIncomingOffer(null);
    if (threadId) {
      void leaveMessagingWebRtcRoom(accessToken, threadId).catch(() => undefined);
    }
  }, [accessToken, stopPolling, threadId]);

  useEffect(() => {
    void fetchMessagingPublicStatus()
      .then((status) => {
        setEnabled(
          status.features.includes("messaging_webrtc_signaling_relay") &&
            status.features.includes("messaging_webrtc_mesh_three") &&
            status.webrtc?.signaling === "redis_relay",
        );
      })
      .catch(() => setEnabled(false));
    return () => teardown();
  }, [teardown]);

  useEffect(() => {
    attachStreamToVideo(localVideoRef.current, localStream);
  }, [localStream, phase]);

  const flushIceQueue = useCallback(async (pc: RTCPeerConnection, peerId: string) => {
    if (!pc.remoteDescription) {
      return;
    }
    const queue = iceQueuesRef.current.get(peerId) ?? [];
    iceQueuesRef.current.set(peerId, []);
    for (const candidate of queue) {
      await pc.addIceCandidate(candidate);
    }
  }, []);

  const ensurePeerConnection = useCallback(
    async (peerUserId: string, stream: MediaStream): Promise<RTCPeerConnection> => {
      const existing = pcsRef.current.get(peerUserId);
      if (existing) {
        return existing;
      }
      const config = await fetchMessagingWebRtcConfig(accessToken);
      const pc = new RTCPeerConnection({ iceServers: config.iceServers });
      pcsRef.current.set(peerUserId, pc);
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));
      pc.ontrack = (event) => {
        const [incoming] = event.streams;
        if (incoming) {
          setRemoteForPeer(peerUserId, incoming);
        }
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
          peerUserId,
        );
      };
      return pc;
    },
    [accessToken, setRemoteForPeer, threadId],
  );

  const acquireLocalMedia = useCallback(async (): Promise<MediaStream> => {
    return navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: "user",
        width: { ideal: 640 },
        height: { ideal: 480 },
      },
      audio: true,
    });
  }, []);

  const connectOffersToExistingPeers = useCallback(
    async (local: MediaStream, peerUserIds: string[]) => {
      for (const peerId of peerUserIds) {
        if (!currentUserId || peerId === currentUserId) {
          continue;
        }
        const pc = await ensurePeerConnection(peerId, local);
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        if (!threadId) {
          return;
        }
        await postMessagingWebRtcSignal(
          accessToken,
          threadId,
          "offer",
          JSON.stringify(offer),
          peerId,
        );
      }
    },
    [accessToken, currentUserId, ensurePeerConnection, threadId],
  );

  const processRemoteSignal = useCallback(
    async (signal: WebRtcSignalEnvelope) => {
      if (!threadId || !currentUserId || seenSignalIdsRef.current.has(signal.id)) {
        return;
      }
      const peerId = signal.fromUserId;
      if (peerId === currentUserId) {
        return;
      }
      seenSignalIdsRef.current.add(signal.id);
      lastPollIdRef.current = signal.id;

      const local = localStreamRef.current;
      if (!local && signal.type !== "offer") {
        return;
      }

      try {
        if (signal.type === "hangup") {
          const pc = pcsRef.current.get(peerId);
          pc?.close();
          pcsRef.current.delete(peerId);
          setRemotePeers((prev) => prev.filter((p) => p.userId !== peerId));
          return;
        }

        if (signal.type === "offer") {
          if (!inCallRef.current) {
            if (!incomingOfferRef.current) {
              incomingOfferRef.current = signal;
              setIncomingOffer(signal);
              setPhase("incoming");
              setStatusLine("Gelen arama — kabul etmek için dokunun");
            }
            return;
          }
          const media = local ?? (await acquireLocalMedia());
          if (!localStreamRef.current) {
            localStreamRef.current = media;
            setLocalStream(media);
          }
          const pc = await ensurePeerConnection(peerId, media);
          const offer = JSON.parse(
            signal.payload,
          ) as RTCSessionDescriptionInit;
          await pc.setRemoteDescription(offer);
          await flushIceQueue(pc, peerId);
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          await postMessagingWebRtcSignal(
            accessToken,
            threadId,
            "answer",
            JSON.stringify(answer),
            peerId,
          );
        } else if (signal.type === "answer") {
          const pc = pcsRef.current.get(peerId);
          if (!pc) {
            return;
          }
          const answer = JSON.parse(
            signal.payload,
          ) as RTCSessionDescriptionInit;
          await pc.setRemoteDescription(answer);
          await flushIceQueue(pc, peerId);
        } else if (signal.type === "ice") {
          const pc = pcsRef.current.get(peerId);
          if (!pc) {
            return;
          }
          const candidate = JSON.parse(
            signal.payload,
          ) as RTCIceCandidateInit;
          if (pc.remoteDescription) {
            await pc.addIceCandidate(candidate);
          } else {
            const queue = iceQueuesRef.current.get(peerId) ?? [];
            queue.push(candidate);
            iceQueuesRef.current.set(peerId, queue);
          }
        }
      } catch (err) {
        setPhase("error");
        setError(formatWebRtcMediaError(err));
      }
    },
    [
      accessToken,
      acquireLocalMedia,
      currentUserId,
      ensurePeerConnection,
      flushIceQueue,
      threadId,
    ],
  );

  useEffect(() => {
    if (!enabled || !threadId || phase !== "idle" || inCallRef.current) {
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
            if (signal.type === "offer") {
              void processRemoteSignal(signal);
              return;
            }
          }
        })
        .catch(() => undefined);
    }, 2500);
    return () => clearInterval(timer);
  }, [accessToken, enabled, phase, processRemoteSignal, threadId]);

  const syncNewRoomPeers = useCallback(async () => {
    if (!threadId || !currentUserId || !localStreamRef.current) {
      return;
    }
    const room = await fetchMessagingWebRtcRoom(accessToken, threadId);
    const missing = room.participants
      .map((p) => p.userId)
      .filter(
        (id) =>
          id !== currentUserId && !pcsRef.current.has(id),
      );
    if (missing.length > 0) {
      await connectOffersToExistingPeers(localStreamRef.current, missing);
    }
  }, [accessToken, connectOffersToExistingPeers, currentUserId, threadId]);

  const startPolling = useCallback(() => {
    if (!threadId || pollTimerRef.current) {
      return;
    }
    pollTimerRef.current = setInterval(() => {
      void syncNewRoomPeers().catch(() => undefined);
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
  }, [accessToken, processRemoteSignal, syncNewRoomPeers, threadId]);

  async function enterCallAndMesh(): Promise<void> {
    if (!threadId || !currentUserId) {
      return;
    }
    const room = await joinMessagingWebRtcRoom(accessToken, threadId);
    inCallRef.current = true;
    const others = room.participants
      .map((p) => p.userId)
      .filter((id) => id !== currentUserId);
    const local = await acquireLocalMedia();
    localStreamRef.current = local;
    setLocalStream(local);
    await connectOffersToExistingPeers(local, others);
    startPolling();
    if (others.length === 0) {
      setStatusLine(`Bekleniyor (en fazla ${MAX_PARTICIPANTS} kişi)…`);
    }
  }

  async function startCall(): Promise<void> {
    if (!threadId || !browserReady || !currentUserId) {
      return;
    }
    setError("");
    stopPolling();
    for (const pc of pcsRef.current.values()) {
      pc.close();
    }
    pcsRef.current.clear();
    inCallRef.current = false;
    if (threadId) {
      await leaveMessagingWebRtcRoom(accessToken, threadId).catch(() => undefined);
    }
    setPhase("outgoing");
    setStatusLine("Kamera izni isteniyor…");
    try {
      await enterCallAndMesh();
      setPhase("connected");
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
      await enterCallAndMesh();
      const offer = incomingOffer;
      incomingOfferRef.current = null;
      setIncomingOffer(null);
      await processRemoteSignal(offer);
      setPhase("connected");
      setStatusLine("Bağlanıyor…");
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

  async function endCall(): Promise<void> {
    if (threadId && currentUserId) {
      for (const peerId of pcsRef.current.keys()) {
        await postMessagingWebRtcSignal(
          accessToken,
          threadId,
          "hangup",
          "{}",
          peerId,
        ).catch(() => undefined);
      }
    }
    teardown();
    setPhase("ended");
    setStatusLine("Arama sonlandı");
  }

  if (!enabled || !threadId || !browserReady || !currentUserId) {
    return null;
  }

  const showVideos =
    phase === "outgoing" || phase === "connected" || phase === "incoming";

  return (
    <div
      className="messaging-webrtc-pilot"
      role="region"
      aria-label="Görüntülü görüşme (en fazla 3 kişi)"
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
            Görüntülü görüşme (max {MAX_PARTICIPANTS})
          </button>
        ) : (
          <button
            type="button"
            className="messaging-webrtc-pilot-btn messaging-webrtc-pilot-btn--end"
            onClick={() => void endCall()}
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
        <div
          className="messaging-webrtc-pilot-videos messaging-webrtc-pilot-videos--mesh"
        >
          <video
            ref={localVideoRef}
            className="messaging-webrtc-pilot-video messaging-webrtc-pilot-video--local"
            autoPlay
            muted
            playsInline
          />
          {remotePeers.map((peer) => (
            <video
              key={peer.userId}
              className="messaging-webrtc-pilot-video messaging-webrtc-pilot-video--remote"
              autoPlay
              playsInline
              ref={(el) => attachStreamToVideo(el, peer.stream)}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
