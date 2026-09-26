import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin", "latin-ext"],
  display: "swap",
  variable: "--font-mail",
});
import { MailSessionProvider } from "@/lib/session";
import { MailThemeProvider } from "@/components/MailThemeProvider";
import { MailPwaRegister } from "@/components/MailPwaRegister";
import { MailHttpsRedirect } from "@/components/MailHttpsRedirect";

export const metadata: Metadata = {
  metadataBase: new URL("https://posta.lerta.com.tr"),
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
  themeColor: "#0f4c81",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="tr" data-mail-theme="light" className={inter.variable}>
      <body className={inter.className}>
        <MailSessionProvider>
          <MailThemeProvider>
            <MailPwaRegister />
            <MailHttpsRedirect />
            {children}
          </MailThemeProvider>
        </MailSessionProvider>
      </body>
    </html>
  );
}
