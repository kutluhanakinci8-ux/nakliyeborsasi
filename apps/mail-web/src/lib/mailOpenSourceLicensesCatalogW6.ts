import { mitLicenseText } from "./ossLicenseTextBlocks";
import type { OpenSourceLicenseEntry } from "./mailOpenSourceLicenseTypes";

/** Faz W6 — Mobil istemci (Expo / React Native); posta Legal’de referans, asıl liste mobil ekranda. */
export const MAIL_WEB_W6_OPEN_SOURCE_LICENSES: OpenSourceLicenseEntry[] = [
  {
    id: "expo",
    sortName: "Expo",
    packageName: "expo · expo-modules-core",
    version: "51.0.39",
    copyright: "Copyright (c) 650 Industries, Inc.",
    licenseShort: "MIT",
    homepage: "https://expo.dev/",
    usageNoteKey: "ossLicenseExpoUsage",
    licenseText: mitLicenseText("Copyright (c) 650 Industries, Inc."),
  },
  {
    id: "react-native",
    sortName: "React Native",
    packageName: "react-native",
    version: "0.74.5",
    copyright: "Copyright (c) Meta Platforms, Inc. and affiliates.",
    licenseShort: "MIT",
    homepage: "https://reactnative.dev/",
    usageNoteKey: "ossLicenseReactNativeUsage",
    licenseText: mitLicenseText(
      "Copyright (c) Meta Platforms, Inc. and affiliates.",
    ),
  },
  {
    id: "expo-auth-session",
    sortName: "expo-auth-session (AppAuth)",
    packageName: "expo-auth-session · expo-web-browser",
    version: "5.5.2",
    copyright: "Copyright (c) 650 Industries, Inc.",
    licenseShort: "MIT",
    homepage: "https://docs.expo.dev/versions/latest/sdk/auth-session/",
    usageNoteKey: "ossLicenseExpoAuthSessionUsage",
    licenseText: mitLicenseText("Copyright (c) 650 Industries, Inc."),
  },
];
