import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Nakliye Borsası",
  description: "TR + UA-EU yük borsası paneli",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr">
      <body>{children}</body>
    </html>
  );
}
