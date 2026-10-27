import { useCallback, useEffect, useRef, useState } from "react";
import { Audio } from "expo-av";
import * as FileSystem from "expo-file-system";

type RecorderState = "idle" | "recording" | "processing";

export type VoiceNoteRecordingPayload = {
  contentBase64: string;
  contentType: string;
  filename: string;
  durationMs: number;
};

export function useLertaVoiceNoteRecorder(params: {
  maxDurationMs: number;
  enabled: boolean;
  onError: (message: string) => void;
}) {
  const { maxDurationMs, enabled, onError } = params;
  const [state, setState] = useState<RecorderState>("idle");
  const [elapsedMs, setElapsedMs] = useState(0);
  const recordingRef = useRef<Audio.Recording | null>(null);
  const startedAtRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      clearTimer();
      void recordingRef.current?.stopAndUnloadAsync();
      recordingRef.current = null;
    };
  }, [clearTimer]);

  const cancelRecording = useCallback(async () => {
    clearTimer();
    setElapsedMs(0);
    setState("idle");
    try {
      await recordingRef.current?.stopAndUnloadAsync();
    } catch {
      // ignore
    }
    recordingRef.current = null;
  }, [clearTimer]);

  const startRecording = useCallback(async () => {
    if (!enabled || state !== "idle") {
      return;
    }
    const permission = await Audio.requestPermissionsAsync();
    if (!permission.granted) {
      onError("Mikrofon izni gerekli.");
      return;
    }
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: true,
      playsInSilentModeIOS: true,
    });
    const recording = new Audio.Recording();
    await recording.prepareToRecordAsync(
      Audio.RecordingOptionsPresets.HIGH_QUALITY,
    );
    await recording.startAsync();
    recordingRef.current = recording;
    startedAtRef.current = Date.now();
    setElapsedMs(0);
    setState("recording");
    clearTimer();
    timerRef.current = setInterval(() => {
      const elapsed = Date.now() - startedAtRef.current;
      setElapsedMs(elapsed);
    }, 250);
  }, [clearTimer, enabled, maxDurationMs, onError, state]);

  const finalizeRecording = useCallback(async (): Promise<VoiceNoteRecordingPayload | null> => {
    const recording = recordingRef.current;
    if (!recording || state !== "recording") {
      return null;
    }
    setState("processing");
    clearTimer();
    try {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      recordingRef.current = null;
      const durationMs = Math.max(
        500,
        Math.min(maxDurationMs, Date.now() - startedAtRef.current),
      );
      setElapsedMs(0);
      setState("idle");
      if (!uri) {
        onError("Kayıt dosyası oluşturulamadı.");
        return null;
      }
      const contentBase64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      await FileSystem.deleteAsync(uri, { idempotent: true });
      if (!contentBase64 || contentBase64.length < 100) {
        onError("Kayıt çok kısa veya boş.");
        return null;
      }
      return {
        contentBase64,
        contentType: "audio/m4a",
        filename: "voice-note.m4a",
        durationMs,
      };
    } catch {
      setState("idle");
      onError("Ses kaydı tamamlanamadı.");
      return null;
    }
  }, [clearTimer, maxDurationMs, onError, state]);

  return {
    state,
    isRecording: state === "recording",
    elapsedMs,
    startRecording,
    cancelRecording,
    finalizeRecording,
  };
}
