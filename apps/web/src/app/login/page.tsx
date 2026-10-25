import { headers } from "next/headers";
import { Suspense } from "react";
import { isLertaCommsPortalHost } from "../../lib/lertaCommsPortal";
import { LoginPageClient } from "./LoginPageClient";

export default async function LoginPage() {
  const host = (await headers()).get("host");
  const isCommsPortal = isLertaCommsPortalHost(host);

  return (
    <Suspense fallback={null}>
      <LoginPageClient initialCommsPortal={isCommsPortal} />
    </Suspense>
  );
}
