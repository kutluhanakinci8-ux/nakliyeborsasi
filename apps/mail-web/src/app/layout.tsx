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
import { cookies, headers } from "next/headers";
import {
  MAIL_UI_LOCALE_COOKIE,
  parseMailUiLocale,
  t,
  type MailUiLocale,
} from "@/lib/mailLocale";

async function readServerMailUiLocale(): Promise<MailUiLocale> {
  const hdrs = await headers();
  const fromQuery = hdrs.get("x-mail-ui-locale");
  if (fromQuery === "en" || fromQuery === "tr") {
    return fromQuery;
  }
  const jar = await cookies();
  return parseMailUiLocale(jar.get(MAIL_UI_LOCALE_COOKIE)?.value);
}

export async function generateMetadata(): Promise<Metadata> {
  const locale = await readServerMailUiLocale();
  const title = t("appMetaTitle", locale);
  return {
    metadataBase: new URL("https://posta.lerta.com.tr"),
    title,
    description: t("appMetaDescription", locale),
    manifest: "/manifest.webmanifest",
    appleWebApp: {
      capable: true,
      title,
      statusBarStyle: "default",
    },
  };
}

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

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const serverLocale = await readServerMailUiLocale();
  return (
    <html
      lang={serverLocale === "en" ? "en" : "tr"}
      data-mail-theme="light"
      className={inter.variable}
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var r=document.documentElement;var k="lerta-mail-theme";var v=localStorage.getItem(k);var mode=(v==="dark"||v==="light"||v==="system")?v:null;if(!mode){mode=window.matchMedia("(prefers-color-scheme: dark)").matches?"system":"light";}var dark=window.matchMedia("(prefers-color-scheme: dark)").matches;var eff=mode==="system"?(dark?"dark":"light"):mode;r.dataset.mailTheme=eff;r.dataset.mailThemeMode=mode;r.dataset.mailThemeFollowsSystem=mode==="system"?"true":"false";if(localStorage.getItem("lerta-mail-read-font")==="large"){r.dataset.mailReadFont="large";}var lk="lerta-mail-ui-locale";var loc=localStorage.getItem(lk);if(loc==="en"||loc==="tr"){r.lang=loc;}}catch(e){}})();`,
          }}
        />
      </head>
      <body className={inter.className}>
        <MailSessionProvider>
          <MailLocaleProvider initialLocale={serverLocale}>
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
