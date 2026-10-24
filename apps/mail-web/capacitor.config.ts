/**
 * Lerta Posta — Capacitor native shell (iOS / Android).
 *
 * Mağaza build: `CAPACITOR_POSTA_SERVER_URL` boş, statik `out` veya gömülü webDir.
 * Pilot / geliştirme: `CAPACITOR_POSTA_SERVER_URL=https://posta.lerta.com.tr`
 */
const config = {
  appId: "com.lerta.posta",
  appName: "Lerta Posta",
  webDir: "out",
  server: {
    url: process.env.CAPACITOR_POSTA_SERVER_URL?.trim() || undefined,
    cleartext: false,
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: true,
    },
  },
};

export default config;
