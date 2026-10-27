import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { readLertaRnWebRtcRtcView } from "./lertaMobileRnWebRtcGlobal";

type Props = {
  streamUrl: string | null;
};

export function NativeMeetRemoteRtcView({
  streamUrl,
}: Props): React.ReactElement | null {
  const RTCView = readLertaRnWebRtcRtcView();
  if (!streamUrl || !RTCView) {
    return streamUrl ? (
      <Text style={styles.hint}>RTCView global eksik — bootstrap dosyasına ekleyin.</Text>
    ) : null;
  }
  return (
    <View style={styles.wrap}>
      <RTCView streamURL={streamUrl} style={styles.video} objectFit="cover" />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { height: 180, borderRadius: 8, overflow: "hidden", marginTop: 8 },
  video: { flex: 1, backgroundColor: "#111" },
  hint: { fontSize: 12, color: "#666", marginTop: 8 },
});
