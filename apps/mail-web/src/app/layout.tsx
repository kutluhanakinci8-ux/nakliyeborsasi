import type { Metadata, Viewport } from "next";
import "./globals.css";
import { MailSessionProvider } from "@/lib/session";
import { MailThemeProvider } from "@/components/MailThemeProvider";
import { MailPwaRegister } from "@/components/MailPwaRegister";

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
    <html lang="tr" data-mail-theme="light">
      <body>
        <MailSessionProvider>
          <MailThemeProvider>
            <MailPwaRegister />
            {children}
          </MailThemeProvider>
        </MailSessionProvider>
      </body>
    </html>
  );
}
