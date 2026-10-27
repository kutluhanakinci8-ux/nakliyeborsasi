"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  blobToBase64,
  pickVoiceNoteMimeType,
  voiceNoteFilenameForMime,
} from "../lib/messagingVoiceNoteBlob";
import type { PendingAttachment } from "../lib/messagingPageHelpers";

type RecorderState = "idle" | "recording" | "processing";

export function useMessagingVoiceNoteRecorder(params: {
  maxDurationMs: number;
  enabled: boolean;
  onError: (message: string) => void;
}) {
  const { maxDurationMs, enabled, onError } = params;
  const [state, setState] = useState<RecorderState>("idle");
  const [elapsedMs, setElapsedMs] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startedAtRef = useRef(0);

  const stopTracks = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }, []);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      clearTimer();
      if (mediaRecorderRef.current?.state === "recording") {
        mediaRecorderRef.current.stop();
      }
      stopTracks();
    };
  }, [clearTimer, stopTracks]);

  const cancelRecording = useCallback(() => {
    clearTimer();
    chunksRef.current = [];
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
    }
    mediaRecorderRef.current = null;
    stopTracks();
    setElapsedMs(0);
    setState("idle");
  }, [clearTimer, stopTracks]);

  const finalizeRecording = useCallback(async (): Promise<PendingAttachment | null> => {
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state !== "recording") {
      return null;
    }
    setState("processing");
    return new Promise((resolve) => {
      recorder.onstop = async () => {
        clearTimer();
        stopTracks();
        const mime = recorder.mimeType || pickVoiceNoteMimeType();
        const blob = new Blob(chunksRef.current, { type: mime });
        chunksRef.current = [];
        mediaRecorderRef.current = null;
        const durationMs = Math.max(
          500,
          Math.min(maxDurationMs, Date.now() - startedAtRef.current),
        );
        setElapsedMs(0);
        setState("idle");
        if (blob.size < 200) {
          onError("Kayıt çok kısa veya boş.");
          resolve(null);
          return;
        }
        try {
          const contentBase64 = await blobToBase64(blob);
          resolve({
            filename: voiceNoteFilenameForMime(mime),
            contentType: mime.split(";")[0] || "audio/webm",
            contentBase64,
            kind: "voice_note",
            durationMs,
          });
        } catch {
          onError("Sesli mesaj kodlanamadı.");
          resolve(null);
        }
      };
      recorder.stop();
    });
  }, [clearTimer, maxDurationMs, onError, stopTracks]);

  const startRecording = useCallback(async () => {
    if (!enabled || state !== "idle") {
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      onError("Bu tarayıcı mikrofon kaydını desteklemiyor.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mime = pickVoiceNoteMimeType();
      let recorder: MediaRecorder;
      try {
        recorder = new MediaRecorder(stream, { mimeType: mime });
      } catch {
        recorder = new MediaRecorder(stream);
      }
      chunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };
      recorder.start(250);
      mediaRecorderRef.current = recorder;
      startedAtRef.current = Date.now();
      setElapsedMs(0);
      setState("recording");
      timerRef.current = setInterval(() => {
        const next = Date.now() - startedAtRef.current;
        setElapsedMs(next);
        if (next >= maxDurationMs) {
          void finalizeRecording();
        }
      }, 200);
    } catch {
      stopTracks();
      onError("Mikrofon izni gerekli.");
    }
  }, [enabled, finalizeRecording, maxDurationMs, onError, state, stopTracks]);

  return {
    state,
    elapsedMs,
    startRecording,
    cancelRecording,
    finalizeRecording,
    isRecording: state === "recording",
  };
}
