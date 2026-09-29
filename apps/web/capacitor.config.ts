/**
 * FS-7C stub — `npx cap sync` öncesi @capacitor/cli kurulumu gerekir.
 */
const config = {
  appId: "com.lerta.app",
  appName: "Lerta",
  webDir: "out",
  server: {
    url: process.env.CAPACITOR_SERVER_URL ?? "https://app.lerta.com.tr",
    cleartext: false,
  },
};

export default config;
