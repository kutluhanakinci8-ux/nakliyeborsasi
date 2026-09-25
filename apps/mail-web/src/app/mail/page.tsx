"use client";

import { Suspense } from "react";
import { MailClient } from "./MailClient";

export default function MailPage() {
  return (
    <Suspense fallback={null}>
      <MailClient />
    </Suspense>
  );
}
