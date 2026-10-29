import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { WebView } from "react-native-webview";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system";
import * as Linking from "expo-linking";
import {
  extractLtrManifestJsonFromHtml,
  renderLtrDocumentHtml,
  validateLtrManifest,
  type LtrManifest,
} from "@nakliyeborsasi/core";

type ViewState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; manifest: LtrManifest; html: string; label: string };

function parseLtr(text: string, label: string): ViewState {
  const json = extractLtrManifestJsonFromHtml(text);
  if (!json) {
    return { status: "error", message: "Geçerli LTR manifest bulunamadı." };
  }
  const validated = validateLtrManifest(json);
  if (!validated.ok) {
    return {
      status: "error",
      message: validated.issues.map((i) => i.message).join(" · "),
    };
  }
  return {
    status: "ready",
    manifest: validated.manifest,
    html: renderLtrDocumentHtml(validated.manifest),
    label,
  };
}

async function readUri(uri: string): Promise<string> {
  return FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.UTF8 });
}

function labelFromUri(uri: string): string {
  try {
    const decoded = decodeURIComponent(uri);
    const parts = decoded.split("/");
    return parts[parts.length - 1] || "belge.ltr";
  } catch {
    return "belge.ltr";
  }
}

export function WinLrtMobileApp() {
  const [state, setState] = useState<ViewState>({ status: "idle" });

  const openUri = useCallback(async (uri: string) => {
    setState({ status: "loading" });
    try {
      const text = await readUri(uri);
      setState(parseLtr(text, labelFromUri(uri)));
    } catch (e) {
      setState({
        status: "error",
        message: e instanceof Error ? e.message : "Dosya okunamadı.",
      });
    }
  }, []);

  const pickDocument = useCallback(async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: ["application/vnd.lerta.document+html", "text/html", "*/*"],
      copyToCacheDirectory: true,
      multiple: false,
    });
    if (result.canceled || !result.assets[0]) {
      return;
    }
    const asset = result.assets[0];
    await openUri(asset.uri);
  }, [openUri]);

  useEffect(() => {
    const handleUrl = (url: string | null) => {
      if (!url) {
        return;
      }
      void openUri(url);
    };
    void Linking.getInitialURL().then(handleUrl);
    const sub = Linking.addEventListener("url", ({ url }) => {
      void handleUrl(url);
    });
    return () => sub.remove();
  }, [openUri]);

  return (
    <View style={styles.root}>
      <View style={styles.toolbar}>
        <Pressable style={styles.primaryBtn} onPress={() => void pickDocument()}>
          <Text style={styles.primaryBtnText}>.ltr aç</Text>
        </Pressable>
        {state.status === "ready" ? (
          <Text style={styles.meta} numberOfLines={1}>
            {state.label} · {state.manifest.title}
          </Text>
        ) : null}
      </View>

      {state.status === "loading" ? (
        <ActivityIndicator style={styles.center} size="large" />
      ) : null}
      {state.status === "error" ? (
        <Text style={styles.error}>{state.message}</Text>
      ) : null}
      {state.status === "idle" ? (
        <Text style={styles.hint}>
          WinLRT — LTR (.ltr) görüntüleyici. Dosya seçin veya WhatsApp / Dosyalar uygulamasından
          “WinLRT ile aç” kullanın.
        </Text>
      ) : null}
      {state.status === "ready" ? (
        <WebView
          style={styles.webview}
          originWhitelist={["*"]}
          source={{ html: state.html }}
          setSupportMultipleWindows={false}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#f6f7f9" },
  toolbar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#dfe3ea",
    backgroundColor: "#fff",
  },
  primaryBtn: {
    backgroundColor: "#0b5cab",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  primaryBtnText: { color: "#fff", fontWeight: "600" },
  meta: { flex: 1, fontSize: 12, color: "#5c6370" },
  hint: { padding: 16, color: "#5c6370", lineHeight: 22 },
  error: { padding: 16, color: "#b42318" },
  center: { marginTop: 32 },
  webview: { flex: 1, backgroundColor: "transparent" },
});
