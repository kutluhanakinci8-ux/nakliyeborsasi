import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Lerta — Posta, Mesajlaşma ve KVKK",
  description:
    "Lerta platformu: kurumsal e-posta SaaS, firma mesajlaşması ve KVKK control plane (U88).",
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
