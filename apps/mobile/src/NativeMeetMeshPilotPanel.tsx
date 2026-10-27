import React, { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { detectRnWebRtcModuleStatus } from "./lertaMobileWebRtcCapabilities";
import { createNativeMeshPilotSession } from "./lertaMobileNativeMeshPilotApi";

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
          void createNativeMeshPilotSession(accessToken, threadId.trim())
            .then((session) => {
              if (!session) {
                setStatus("Oturum oluşturulamadı (capabilities veya thread).");
                return;
              }
              setStatus(
                `Pilot ${session.pilotSessionId.slice(0, 8)}… token ${session.joinToken.slice(0, 8)}…`,
              );
            })
            .finally(() => setBusy(false));
        }}
      >
        <Text style={styles.buttonText}>
          {busy ? "Oluşturuluyor…" : "Native pilot oturumu"}
        </Text>
      </Pressable>
      {status ? <Text style={styles.hint}>{status}</Text> : null}
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
