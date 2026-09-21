import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Nakliye Borsası",
  description: "TR + UA-EU freight exchange",
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
