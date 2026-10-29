"use client";

import Link from "next/link";
import {
  SOFTWARE_DOWNLOAD_PAGE,
  WINLRT_SOFTWARE_CATALOG,
  type SoftwareDownloadItem,
} from "@/lib/winlrtSoftwareCatalog";

function DownloadRow({ item }: { item: SoftwareDownloadItem }) {
  const badge = item.available ? "İndir" : `Yakında · ${item.phase}`;
  const inner = (
    <>
      <span className="software-dl-row__name">{item.name}</span>
      <span className="software-dl-row__desc">{item.description}</span>
      <span
        className={
          item.available
            ? "software-dl-row__badge software-dl-row__badge--ready"
            : "software-dl-row__badge"
        }
      >
        {badge}
      </span>
    </>
  );

  if (!item.available) {
    return (
      <li className="software-dl-row software-dl-row--soon" id={item.id}>
        {inner}
      </li>
    );
  }

  if (item.href.startsWith("/")) {
    return (
      <li className="software-dl-row software-dl-row--ready">
        <Link href={item.href} download={item.platform === "sample" ? true : undefined}>
          {inner}
        </Link>
      </li>
    );
  }

  return (
    <li className="software-dl-row software-dl-row--ready">
      <a href={item.href}>{inner}</a>
    </li>
  );
}

export function SoftwareDownloadPageClient() {
  const programs = WINLRT_SOFTWARE_CATALOG.filter((i) =>
    ["windows", "macos", "android", "ios"].includes(i.platform),
  );
  const extras = WINLRT_SOFTWARE_CATALOG.filter((i) =>
    ["sample", "web"].includes(i.platform),
  );

  return (
    <div className="software-dl-page">
      <p className="software-dl-intro">{SOFTWARE_DOWNLOAD_PAGE.lead}</p>
      <p className="software-dl-note">
        Lerta Posta ve Lerta Mesaj entegrasyonu WinLRT istemcileri yayınlandıktan sonra
        gelecektir. Format: <code>.ltr</code> (Lerta Document).
      </p>

      <section className="software-dl-section" aria-labelledby="winlrt-programs">
        <h2 id="winlrt-programs" className="software-dl-section__title">
          WinLRT istemcileri
        </h2>
        <ul className="software-dl-list">
          {programs.map((item) => (
            <DownloadRow key={item.id} item={item} />
          ))}
        </ul>
      </section>

      <section className="software-dl-section" aria-labelledby="winlrt-extras">
        <h2 id="winlrt-extras" className="software-dl-section__title">
          Deneme ve örnekler
        </h2>
        <ul className="software-dl-list">
          {extras.map((item) => (
            <DownloadRow key={item.id} item={item} />
          ))}
        </ul>
      </section>

      <section className="software-dl-section software-dl-section--muted">
        <h2 className="software-dl-section__title">Yol haritası</h2>
        <ol className="software-dl-roadmap">
          <li>W1 — Windows · W2 — macOS (bu sayfadan)</li>
          <li>W3 — Google Play · W4 — App Store</li>
          <li>W5 — Belge oluşturma · W6+ — Posta / Mesaj</li>
        </ol>
        <p className="software-dl-note">
          Teknik plan: repoda <code>docs/WINLRT_PRODUCT_ROADMAP.md</code>
        </p>
      </section>
    </div>
  );
}
