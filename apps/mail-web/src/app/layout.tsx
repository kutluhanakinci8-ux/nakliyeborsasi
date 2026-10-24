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
import { MailEmbeddedSessionBridge } from "@/components/MailEmbeddedSessionBridge";

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
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var k="lerta-mail-theme";var v=localStorage.getItem(k);var mode=(v==="dark"||v==="light"||v==="system")?v:null;if(!mode){mode=window.matchMedia("(prefers-color-scheme: dark)").matches?"system":"light";}var dark=window.matchMedia("(prefers-color-scheme: dark)").matches;var eff=mode==="system"?(dark?"dark":"light"):mode;var r=document.documentElement;r.dataset.mailTheme=eff;r.dataset.mailThemeMode=mode;r.dataset.mailThemeFollowsSystem=mode==="system"?"true":"false";}catch(e){}})();`,
          }}
        />
      </head>
      <body className={inter.className}>
        <MailSessionProvider>
          <MailThemeProvider>
            <MailEmbeddedSessionBridge />
            <MailPwaRegister />
            <MailHttpsRedirect />
            {children}
          </MailThemeProvider>
        </MailSessionProvider>
      </body>
    </html>
  );
}
