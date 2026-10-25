"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useMailSession } from "@/lib/session";
import { useMailLocale } from "@/lib/MailLocaleProvider";
import { useMailClientController } from "./useMailClientController";
import { MailClientShell } from "./MailClientShell";

export function MailClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { accessToken, logout } = useMailSession();
  const { t } = useMailLocale();
  const embedMode =
    searchParams.get("embed") === "1" || searchParams.get("embedded") === "1";
  const embedHubShell = searchParams.get("embedHub") === "1";
  const shellBrand = searchParams.get("shellBrand")?.trim() ?? "";

  const mail = useMailClientController({
    accessToken,
    logout,
    router,
    searchParams,
    embedMode,
    embedHubShell,
    shellBrand,
    translate: t,
  });

  return <MailClientShell mail={mail} />;
}
