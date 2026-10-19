import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Lerta — U88, Posta ve Mesaj",
  description:
    "Lerta platformu: KVKK control plane (U88), kurumsal e-posta SaaS ve firma mesajlaşması.",
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
