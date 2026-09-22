"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { isPlatformAdmin } from "../../lib/platformAdmin";
import { useWebSession } from "../../context/WebSessionProvider";

/** Platform operatörü canlı siteye geçtiğinde konsola geri dönüş */
export function PlatformAdminLiveSiteBanner() {
  const pathname = usePathname();
  const { session, isReady } = useWebSession();

  if (!isReady || !session || !isPlatformAdmin(session)) {
    return null;
  }
  if (pathname.startsWith("/admin")) {
    return null;
  }

  return (
    <div className="platform-admin-live-banner" role="region" aria-label="Yönetim konsolu">
      <p>
        <strong>Platform operatörü</strong> — canlı siteyi inceliyorsunuz.
      </p>
      <Link href="/admin" className="platform-admin-live-banner-link">
        Yönetim konsoluna dön
      </Link>
    </div>
  );
}
