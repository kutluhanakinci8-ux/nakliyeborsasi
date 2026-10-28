import type { ReactNode } from "react";
import type { Metadata } from "next";
import { MarketingPageShell } from "@/components/MarketingPageShell";
import { LEGAL_DISCLAIMER, SUPPORT_EMAIL } from "@/lib/marketingSite";

type Props = {
  title: string;
  description: string;
  heading: string;
  children: ReactNode;
};

export function MarketingLegalPage({
  title,
  description,
  heading,
  children,
}: Props) {
  return (
    <MarketingPageShell narrow>
      <h1>{heading}</h1>
      {children}
      <p style={{ color: "var(--muted)", marginTop: "2rem", fontSize: "0.9rem" }}>
        {LEGAL_DISCLAIMER}
      </p>
    </MarketingPageShell>
  );
}

export function legalMetadata(title: string, description: string): Metadata {
  return { title, description };
}

export { SUPPORT_EMAIL };
