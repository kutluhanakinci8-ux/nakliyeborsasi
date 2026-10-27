import React, { useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { detectRnWebRtcModuleStatus } from "./lertaMobileWebRtcCapabilities";
import { createNativeMeshPilotSession } from "./lertaMobileNativeMeshPilotApi";
import { readUserIdFromAccessToken } from "./lertaMobileJwt";
import {
  startNativeRnMeshMediaPilot,
  type NativeRnMeshRunState,
} from "./lertaMobileRnMeshMediaRunner";
import { NativeMeetRemoteRtcView } from "./NativeMeetRemoteRtcView";

type Props = {
  accessToken: string;
};

export function NativeMeetMeshPilotPanel({
  accessToken,
}: Props): React.ReactElement | null {
  const linked = detectRnWebRtcModuleStatus() === "linked_dev_client";
  const [threadId, setThreadId] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [meshState, setMeshState] = useState<NativeRnMeshRunState | null>(null);
  const runnerRef = useRef<ReturnType<typeof startNativeRnMeshMediaPilot> | null>(
    null,
  );

  useEffect(() => {
    return () => {
      runnerRef.current?.stop();
      runnerRef.current = null;
    };
  }, []);

  if (!linked) {
    return null;
  }

  return (
    <View style={styles.box}>
      <Text style={styles.title}>Native mesh pilot (RN WebRTC)</Text>
      <TextInput
        style={styles.input}
        placeholder="Thread ID"
        value={threadId}
        onChangeText={setThreadId}
        autoCapitalize="none"
      />
      <Pressable
        style={styles.button}
        disabled={busy || threadId.trim().length < 8}
        onPress={() => {
          setBusy(true);
          runnerRef.current?.stop();
          runnerRef.current = null;
          const trimmed = threadId.trim();
          const userId = readUserIdFromAccessToken(accessToken);
          void createNativeMeshPilotSession(accessToken, trimmed)
            .then((session) => {
              if (!session || !userId) {
                setStatus("Oturum veya kullanıcı kimliği alınamadı.");
                return;
              }
              setStatus(
                `Pilot ${session.pilotSessionId.slice(0, 8)}… — mesh başlatılıyor`,
              );
              runnerRef.current = startNativeRnMeshMediaPilot({
                accessToken,
                threadId: trimmed,
                pilotSession: session,
                currentUserId: userId,
                onUpdate: (state) => {
                  setMeshState(state);
                  setStatus(state.message);
                },
              });
            })
            .finally(() => setBusy(false));
        }}
      >
        <Text style={styles.buttonText}>
          {busy ? "Başlatılıyor…" : "Native mesh (sinyal + medya)"}
        </Text>
      </Pressable>
      {status ? <Text style={styles.hint}>{status}</Text> : null}
      {meshState ? (
        <Text style={styles.hint}>
          Faz: {meshState.phase} · peers: {meshState.peerCount}
          {meshState.backgroundPaused ? " · arka plan" : ""}
          {meshState.lastSignalType ? ` · ${meshState.lastSignalType}` : ""}
        </Text>
      ) : null}
      <NativeMeetRemoteRtcView streamUrl={meshState?.remoteStreamUrl ?? null} />
    </View>
  );
}

const styles = StyleSheet.create({
  box: { marginTop: 12, gap: 8 },
  title: { fontWeight: "600" },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 10,
  },
  button: {
    backgroundColor: "#1a5cff",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  buttonText: { color: "#fff", fontWeight: "600" },
  hint: { fontSize: 12, color: "#444" },
});
