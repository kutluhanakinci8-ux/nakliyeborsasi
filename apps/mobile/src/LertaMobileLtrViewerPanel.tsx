import { Linking, Pressable, StyleSheet, Text, View } from "react-native";

const SAMPLE_VIEWER_URL = "https://www.lerta.com.tr/ltr/viewer";

/**
 * F5: WebView + native sealed file open.
 * F3: Mesaj eklerinden bu ekrana yönlendirme.
 */
export function LertaMobileLtrViewerPanel() {
  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>LTR Viewer</Text>
      <Text style={styles.body}>
        Mobil mağaza sürümü (Google Play / App Store) ve mesaj ekleri F5 ile tam ekran açılacak.
        Şimdilik örnek belgeyi web viewer’da açabilirsiniz.
      </Text>
      <Pressable
        style={styles.button}
        onPress={() => void Linking.openURL(SAMPLE_VIEWER_URL)}
      >
        <Text style={styles.buttonText}>Web viewer’ı aç</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: 16, gap: 12 },
  title: { fontSize: 18, fontWeight: "600" },
  body: { fontSize: 14, lineHeight: 20, opacity: 0.85 },
  button: {
    alignSelf: "flex-start",
    backgroundColor: "#0b5cab",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  buttonText: { color: "#fff", fontWeight: "600" },
});
