import type { OpenSourceLicenseEntry } from "./mailOpenSourceLicenseTypes";

/** Faz W9 — mobil native yığın (Gradle/CocoaPods); npm lock’ta yok, Legal açıklaması. */
export const MAIL_WEB_W9_OPEN_SOURCE_LICENSES: OpenSourceLicenseEntry[] = [
  {
    id: "okhttp3-android",
    sortName: "OkHttp (Android)",
    packageName: "com.squareup.okhttp3:okhttp",
    version: "Gradle transitive",
    copyright: "Copyright (c) Square, Inc.",
    licenseShort: "Apache-2.0",
    homepage: "https://square.github.io/okhttp/",
    usageNoteKey: "ossLicenseOkhttpAndroidUsage",
    licenseText: `OkHttp disclosure (Android)

React Native / Expo Android builds may pull OkHttp via the native networking stack or dependencies.
It is not distributed as an npm package in apps/mobile; see the Android build SBOM / Play Console
OSS disclosures when shipping APK/AAB.`,
  },
  {
    id: "libvpx-native",
    sortName: "libvpx (native WebRTC)",
    packageName: "libvpx · libwebm",
    version: "OS / WebRTC stack",
    copyright: "Copyright (c) WebM Project contributors",
    licenseShort: "BSD-3-Clause",
    homepage: "https://www.webmproject.org/",
    usageNoteKey: "ossLicenseLibvpxNativeUsage",
    licenseText: `libvpx / libwebm disclosure (mobile)

Future native video calling may link platform WebRTC stacks that bundle libvpx and libwebm.
These codecs are not listed in the Expo npm SBOM; they ship with the OS or native WebRTC SDK.`,
  },
];
