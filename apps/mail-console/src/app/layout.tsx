import type { Metadata } from "next";
import "./globals.css";
import { ConsoleSessionProvider } from "@/lib/session";

export const metadata: Metadata = {
  title: "Lerta Mail Yönetim",
  description: "Kurumsal posta — domain ve kutu yönetimi",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="tr">
      <body>
        <ConsoleSessionProvider>{children}</ConsoleSessionProvider>
      </body>
    </html>
  );
}
