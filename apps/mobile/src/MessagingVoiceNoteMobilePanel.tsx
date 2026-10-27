import React, { useEffect, useState } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  fetchMessagingVoiceNoteStatus,
  sendMessagingVoiceNote,
} from "./lertaMobileMessagingApi";
import { useLertaVoiceNoteRecorder } from "./useLertaVoiceNoteRecorder";

type Props = {
  accessToken: string;
  initialThreadId?: string | null;
};

function formatElapsed(ms: number): string {
  const sec = Math.floor(ms / 1000);
  const min = Math.floor(sec / 60);
  const rem = sec % 60;
  return `${min}:${rem.toString().padStart(2, "0")}`;
}

export function MessagingVoiceNoteMobilePanel({
  accessToken,
  initialThreadId,
}: Props): React.ReactElement | null {
  const [threadId, setThreadId] = useState(initialThreadId ?? "");
  const [status, setStatus] = useState<Awaited<
    ReturnType<typeof fetchMessagingVoiceNoteStatus>
  > | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialThreadId) {
      setThreadId(initialThreadId);
    }
  }, [initialThreadId]);

  useEffect(() => {
    void fetchMessagingVoiceNoteStatus(accessToken).then(setStatus);
  }, [accessToken]);

  const maxDurationMs = status?.maxDurationMs ?? 180_000;
  const enabled = Boolean(
    status?.faz1Enabled && status?.mobileFaz3Enabled,
  );

  const recorder = useLertaVoiceNoteRecorder({
    maxDurationMs,
    enabled,
    onError: (text) => setError(text),
  });

  if (!enabled) {
    return (
      <Text style={styles.hint}>
        Sesli mesaj (mobil VM-3) bu ortamda kapalı veya VM-1 gerekli.
      </Text>
    );
  }

  async function handleSend(): Promise<void> {
    setError(null);
    setMessage(null);
    const trimmed = threadId.trim();
    if (!trimmed) {
      setError("Thread ID gerekli.");
      return;
    }
    const payload = await recorder.finalizeRecording();
    if (!payload) {
      return;
    }
    const result = await sendMessagingVoiceNote(accessToken, trimmed, payload);
    if (!result.ok) {
      setError(result.error ?? "Gönderilemedi");
      return;
    }
    setMessage("Sesli mesaj gönderildi.");
  }

  return (
    <View style={styles.box}>
      <Text style={styles.title}>Sesli mesaj (Expo)</Text>
      <TextInput
        style={styles.input}
        placeholder="Thread UUID"
        value={threadId}
        onChangeText={setThreadId}
        autoCapitalize="none"
        autoCorrect={false}
      />
      {recorder.isRecording ? (
        <View style={styles.row}>
          <Text style={styles.timer}>{formatElapsed(recorder.elapsedMs)}</Text>
          <Pressable
            style={styles.secondaryBtn}
            onPress={() => void recorder.cancelRecording()}
          >
            <Text>İptal</Text>
          </Pressable>
          <Pressable
            style={styles.primaryBtn}
            onPress={() => void handleSend()}
          >
            <Text style={styles.primaryBtnText}>Gönder</Text>
          </Pressable>
        </View>
      ) : (
        <Pressable
          style={styles.primaryBtn}
          onPress={() => void recorder.startRecording()}
          disabled={recorder.state === "processing"}
        >
          <Text style={styles.primaryBtnText}>Kayda başla</Text>
        </Pressable>
      )}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {message ? <Text style={styles.ok}>{message}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    width: "100%",
    maxWidth: 360,
    marginTop: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
  },
  title: { fontWeight: "600", marginBottom: 8 },
  hint: { fontSize: 13, color: "#666", marginTop: 12, textAlign: "center" },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 6,
    padding: 8,
    marginBottom: 8,
  },
  row: { flexDirection: "row", alignItems: "center", gap: 8 },
  timer: { flex: 1, fontVariant: ["tabular-nums"] },
  primaryBtn: {
    backgroundColor: "#1a5cff",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: "center",
  },
  primaryBtnText: { color: "#fff", fontWeight: "600" },
  secondaryBtn: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ccc",
  },
  error: { color: "#b00020", marginTop: 8, fontSize: 13 },
  ok: { color: "#0a7a32", marginTop: 8, fontSize: 13 },
});
