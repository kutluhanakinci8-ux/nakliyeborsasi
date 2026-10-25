import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin", "latin-ext"],
  display: "swap",
  variable: "--font-mail",
});
import { MailLocaleProvider } from "@/lib/MailLocaleProvider";
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
  colorScheme: "light dark",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#0f4c81" },
    { media: "(prefers-color-scheme: dark)", color: "#061a2e" },
  ],
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
            __html: `(function(){try{var r=document.documentElement;var k="lerta-mail-theme";var v=localStorage.getItem(k);var mode=(v==="dark"||v==="light"||v==="system")?v:null;if(!mode){mode=window.matchMedia("(prefers-color-scheme: dark)").matches?"system":"light";}var dark=window.matchMedia("(prefers-color-scheme: dark)").matches;var eff=mode==="system"?(dark?"dark":"light"):mode;r.dataset.mailTheme=eff;r.dataset.mailThemeMode=mode;r.dataset.mailThemeFollowsSystem=mode==="system"?"true":"false";if(localStorage.getItem("lerta-mail-read-font")==="large"){r.dataset.mailReadFont="large";}}catch(e){}})();`,
          }}
        />
      </head>
      <body className={inter.className}>
        <MailSessionProvider>
          <MailLocaleProvider>
            <MailThemeProvider>
              <MailEmbeddedSessionBridge />
              <MailPwaRegister />
              <MailHttpsRedirect />
              {children}
            </MailThemeProvider>
          </MailLocaleProvider>
        </MailSessionProvider>
      </body>
    </html>
  );
}
