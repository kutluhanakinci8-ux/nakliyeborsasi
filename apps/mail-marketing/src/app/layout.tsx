import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Lerta Mail — Kurumsal e-posta",
  description:
    "Kendi domaininizle kurumsal posta: webmail, DNS doğrulama ve kutu yönetimi.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="tr">
      <body>{children}</body>
    </html>
  );
}
