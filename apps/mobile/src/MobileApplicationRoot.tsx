import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { StatusBar } from "expo-status-bar";

export class MobileApplicationRoot extends React.Component {
  public render(): React.ReactNode {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Lerta Logistics Mobile</Text>
        <Text>React Native (Expo) iskeleti — aynı JWT API</Text>
        <StatusBar style="auto" />
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: "600",
    marginBottom: 8,
  },
});
