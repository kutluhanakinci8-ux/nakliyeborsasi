import React, { useMemo } from "react";
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

type LegalPayload = {
  webCatalog: Array<{
    id: string;
    sortName: string;
    packageName: string;
    licenseShort: string;
  }>;
  mobilePackages: Array<{
    name: string;
    version: string | null;
    licenses: string;
  }>;
};

// eslint-disable-next-line @typescript-eslint/no-require-imports
const legalData = require("../assets/lerta-legal-notices.json") as LegalPayload;

type Props = {
  onBack: () => void;
};

export function OpenSourceLegalScreen({ onBack }: Props) {
  const rows = useMemo(() => {
    const catalog = legalData.webCatalog.map((e) => ({
      key: `cat-${e.id}`,
      title: e.sortName,
      subtitle: `${e.packageName} · ${e.licenseShort}`,
    }));
    const npm = legalData.mobilePackages.slice(0, 80).map((p) => ({
      key: `npm-${p.name}`,
      title: p.name,
      subtitle: `${p.version ?? "?"} · ${p.licenses}`,
    }));
    return [...catalog, ...npm];
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={onBack} accessibilityRole="button">
          <Text style={styles.back}>← Geri</Text>
        </Pressable>
        <Text style={styles.title}>Açık kaynak lisansları</Text>
        <Text style={styles.lead}>
          Posta web kataloğu + mobil npm SBOM (W6). Tam metinler posta.lerta.com.tr
          Ayarlar → Lisanslar.
        </Text>
      </View>
      <FlatList
        data={rows}
        keyExtractor={(item) => item.key}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <Text style={styles.rowTitle}>{item.title}</Text>
            <Text style={styles.rowSub}>{item.subtitle}</Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff", paddingTop: 48 },
  header: { paddingHorizontal: 20, paddingBottom: 12 },
  back: { fontSize: 16, color: "#0f4c81", marginBottom: 8 },
  title: { fontSize: 22, fontWeight: "600", marginBottom: 6 },
  lead: { fontSize: 14, color: "#5c6370", lineHeight: 20 },
  row: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#dde1e8",
  },
  rowTitle: { fontSize: 16, fontWeight: "500" },
  rowSub: { fontSize: 13, color: "#5c6370", marginTop: 4 },
});
