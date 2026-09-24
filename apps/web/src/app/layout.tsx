import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import "./corporate-theme.css";
import { AppProviders } from "./providers";

const inter = Inter({
  subsets: ["latin", "cyrillic"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Lerta Logistics",
  description:
    "LERTA LOGISTICS — TR · UA · EU koridorunda yük arama, ihale ve lojistik iş birliği platformu.",
};

export const dynamic = "force-dynamic";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr" className={inter.variable}>
      <body className={inter.className}>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
