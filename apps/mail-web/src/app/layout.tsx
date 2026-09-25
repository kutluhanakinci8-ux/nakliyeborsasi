import type { Metadata } from "next";
import "./globals.css";
import { MailSessionProvider } from "@/lib/session";

export const metadata: Metadata = {
  title: "Lerta Posta",
  description: "Kurumsal e-posta — lerta.com.tr",
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
