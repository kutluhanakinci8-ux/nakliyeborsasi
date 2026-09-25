import type { Metadata, Viewport } from "next";
import "./globals.css";
import { MailSessionProvider } from "@/lib/session";

export const metadata: Metadata = {
  title: "Lerta Posta",
  description: "Kurumsal e-posta — lerta.com.tr",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Lerta Posta",
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#1a73e8",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="tr">
      <body>
        <MailSessionProvider>{children}</MailSessionProvider>
      </body>
    </html>
  );
}
