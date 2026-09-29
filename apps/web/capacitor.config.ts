/**
 * FS-7C / FS-12B — Capacitor shell stub.
 * Mağaza build: `CAPACITOR_SERVER_URL` boş, `next export` → `out`, sonra `npx cap sync`.
 * Geliştirme: CAPACITOR_SERVER_URL=https://app.lerta.com.tr
 */
const config = {
  appId: "com.lerta.app",
  appName: "Lerta",
  webDir: "out",
  server: {
    url: process.env.CAPACITOR_SERVER_URL?.trim() || undefined,
    cleartext: false,
  },
};

export default config;
