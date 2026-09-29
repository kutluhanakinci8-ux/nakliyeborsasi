"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useMailSession } from "@/lib/session";
import { useMailClientController } from "./useMailClientController";
import { MailClientShell } from "./MailClientShell";

export function MailClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { accessToken, logout } = useMailSession();
  const embedMode =
    searchParams.get("embed") === "1" || searchParams.get("embedded") === "1";

  const mail = useMailClientController({
    accessToken,
    logout,
    router,
    searchParams,
    embedMode,
  });

  return <MailClientShell mail={mail} />;
}
