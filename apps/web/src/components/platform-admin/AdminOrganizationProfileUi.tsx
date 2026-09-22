import type { ReactNode } from "react";
import type { OrganizationProfile } from "../../lib/organizationProfile";
import { formatParticipantType } from "../../lib/PlatformAdminApiClient";
import {
  SocialPlatformIconLink,
  type SocialPlatformId,
} from "../SocialPlatformIcon";

type CompanyMeta = {
  legalName: string;
  participantTypeCode: string | null;
  userCount: number;
  listingCount: number;
  id: string;
};

function displayValue(value: string): string {
  const trimmed = value.trim();
  return trimmed || "—";
}

function ReadonlyRow({
  label,
  value,
  href,
  mono,
}: {
  label: string;
  value: string;
  href?: string;
  mono?: boolean;
}) {
  const shown = displayValue(value);
  const empty = !value.trim();
  return (
    <div className={`admin-corp-dl-row${empty ? " admin-corp-dl-row--empty" : ""}`}>
      <dt>{label}</dt>
      <dd className={mono ? "admin-corp-mono" : undefined}>
        {href && value.trim() ? (
          <a href={href} target="_blank" rel="noreferrer">{shown}</a>
        ) : (
          shown
        )}
      </dd>
    </div>
  );
}

function CorpBlock({
  title,
  accent,
  children,
  wide,
  className,
}: {
  title: string;
  accent: "navy" | "teal" | "amber" | "violet" | "slate";
  children: ReactNode;
  wide?: boolean;
  className?: string;
}) {
  return (
    <section
      className={[
        "admin-corp-block",
        `admin-corp-block--${accent}`,
        wide ? "admin-corp-block--wide" : "",
        className ?? "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <header className="admin-corp-block-head">
        <h3 className="admin-corp-block-title">{title}</h3>
      </header>
      <div className="admin-corp-block-body">{children}</div>
    </section>
  );
}

function serviceTags(summary: string): string[] {
  return summary
    .split(/[·,;|/]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

const SOCIAL_PLATFORMS: {
  id: SocialPlatformId;
  urlKey: keyof OrganizationProfile;
}[] = [
  { id: "instagram", urlKey: "instagramUrl" },
  { id: "facebook", urlKey: "facebookUrl" },
  { id: "x", urlKey: "twitterUrl" },
  { id: "youtube", urlKey: "youtubeUrl" },
  { id: "linkedin", urlKey: "linkedinUrl" },
];

function shortCompanyId(id: string): string {
  if (id.length <= 14) {
    return id;
  }
  return `${id.slice(0, 8)}…${id.slice(-4)}`;
}

export function AdminCorporateProfileHero({
  profile,
  company,
  isEditing,
  onStartEdit,
  onSave,
  onCancelEdit,
}: {
  profile: OrganizationProfile;
  company: CompanyMeta | undefined;
  isEditing: boolean;
  onStartEdit: () => void;
  onSave: () => void;
  onCancelEdit: () => void;
}) {
  const title =
    profile.tradeName.trim() ||
    profile.legalName.trim() ||
    company?.legalName ||
    "Firma profili";
  const subtitle = profile.legalName.trim() || company?.legalName || "";
  const companyId = company?.id ?? "";

  return (
    <header className="admin-corp-hero admin-corp-hero--premium">
      <div className="admin-corp-hero-brand">
        <div className="admin-corp-hero-logo-wrap">
          {profile.logoUrl ? (
            <img
              src={profile.logoUrl}
              alt=""
              className="admin-corp-hero-logo"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="admin-corp-hero-logo admin-corp-hero-logo--empty">
              {title.slice(0, 2).toLocaleUpperCase("tr-TR")}
            </div>
          )}
        </div>
        <div className="admin-corp-hero-titles">
          <p className="admin-corp-hero-eyebrow">Kurumsal profil</p>
          <h2 className="admin-corp-hero-title">{title}</h2>
          {subtitle && subtitle !== title ? (
            <p className="admin-corp-hero-subtitle">{subtitle}</p>
          ) : null}
          <div className="admin-corp-hero-pills">
            <span className="admin-org-badge admin-corp-pill">
              {formatParticipantType(company?.participantTypeCode ?? null)}
            </span>
            <span className="admin-org-badge admin-corp-pill">
              {company?.userCount ?? 0} kullanıcı
            </span>
            <span className="admin-org-badge admin-corp-pill">
              {company?.listingCount ?? 0} ilan
            </span>
            {profile.countryCode ? (
              <span className="admin-org-badge admin-corp-pill">
                {profile.countryCode}
                {profile.city.trim() ? ` · ${profile.city}` : ""}
              </span>
            ) : profile.city.trim() ? (
              <span className="admin-org-badge admin-corp-pill">{profile.city}</span>
            ) : null}
          </div>
        </div>
      </div>
      <div className="admin-corp-hero-actions">
        {isEditing ? (
          <>
            <button type="button" className="admin-btn-secondary" onClick={onCancelEdit}>
              İptal
            </button>
            <button type="button" className="admin-btn-primary" onClick={onSave}>
              Değişiklikleri kaydet
            </button>
          </>
        ) : (
          <button type="button" className="admin-btn-primary" onClick={onStartEdit}>
            Profili düzenle
          </button>
        )}
      </div>
      <div className="admin-corp-hero-contact">
        {profile.addressLine.trim() ? (
          <p className="admin-corp-hero-address">{profile.addressLine}</p>
        ) : null}
        <div className="admin-corp-contact-strip">
          {profile.primaryEmail.trim() ? (
            <a
              className="admin-corp-contact-chip"
              href={`mailto:${profile.primaryEmail}`}
            >
              <span className="admin-corp-contact-chip-icon" aria-hidden>@</span>
              {profile.primaryEmail}
            </a>
          ) : null}
          {profile.phone.trim() ? (
            <a className="admin-corp-contact-chip" href={`tel:${profile.phone}`}>
              <span className="admin-corp-contact-chip-icon" aria-hidden>☎</span>
              {profile.phone}
            </a>
          ) : null}
          {profile.whatsappNumber.trim() ? (
            <span className="admin-corp-contact-chip admin-corp-contact-chip--static">
              <span className="admin-corp-contact-chip-icon" aria-hidden>WA</span>
              {profile.whatsappNumber}
            </span>
          ) : null}
          {profile.website.trim() ? (
            <a
              className="admin-corp-contact-chip admin-corp-contact-chip--web"
              href={profile.website}
              target="_blank"
              rel="noreferrer"
            >
              <span className="admin-corp-contact-chip-icon" aria-hidden>↗</span>
              Web sitesi
            </a>
          ) : null}
        </div>
        {companyId ? (
          <p className="admin-corp-hero-id" title={companyId}>
            Firma kimliği <code>{shortCompanyId(companyId)}</code>
          </p>
        ) : null}
      </div>
    </header>
  );
}

function InstagramMetric({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  const shown = displayValue(value);
  return (
    <div className="admin-corp-ig-metric">
      <span className="admin-corp-ig-metric-value">{shown}</span>
      <span className="admin-corp-ig-metric-label">{label}</span>
    </div>
  );
}

export function AdminCorporateProfileOverview({
  profile,
}: {
  profile: OrganizationProfile;
}) {
  const services = serviceTags(profile.servicesSummary);
  const hasInstagramUrl = profile.instagramUrl.trim().length > 0;
  const hasAnySocial = SOCIAL_PLATFORMS.some((p) =>
    String(profile[p.urlKey] ?? "").trim(),
  );

  return (
    <div className="admin-corp-overview admin-corp-overview--premium">
      <CorpBlock title="Kimlik ve vergi" accent="navy">
        <dl className="admin-corp-dl admin-corp-dl--compact">
          <ReadonlyRow label="Ticari unvan" value={profile.tradeName} />
          <ReadonlyRow label="Resmi unvan" value={profile.legalName} />
          <ReadonlyRow label="Vergi / TIN" value={profile.taxNumber} mono />
          <ReadonlyRow label="MERSİS" value={profile.mersisNumber} mono />
          <ReadonlyRow label="Vergi dairesi" value={profile.taxOfficeLine} />
        </dl>
      </CorpBlock>

      <CorpBlock title="İletişim" accent="teal">
        <dl className="admin-corp-dl admin-corp-dl--compact">
          <ReadonlyRow label="E-posta" value={profile.primaryEmail} />
          <ReadonlyRow label="Telefon" value={profile.phone} />
          <ReadonlyRow label="WhatsApp" value={profile.whatsappNumber} />
          <ReadonlyRow label="Web" value={profile.website} href={profile.website} />
          <ReadonlyRow label="KEP" value={profile.kepAddress} />
        </dl>
      </CorpBlock>

      <CorpBlock title="Kayıt ve yetki" accent="amber">
        <dl className="admin-corp-dl admin-corp-dl--compact">
          <ReadonlyRow label="Ticaret sicil" value={profile.tradeRegistryNumber} />
          <ReadonlyRow
            label="Ulaştırma yetki"
            value={profile.transportLicenseNumber}
          />
          <ReadonlyRow label="Çalışma saatleri" value={profile.workingHours} />
        </dl>
      </CorpBlock>

      <CorpBlock title="Konum" accent="slate">
        <dl className="admin-corp-dl admin-corp-dl--compact">
          <ReadonlyRow label="Şehir" value={profile.city} />
          <ReadonlyRow label="Ülke" value={profile.countryCode} />
          <ReadonlyRow label="Açık adres" value={profile.addressLine} />
        </dl>
      </CorpBlock>

      <CorpBlock title="Web ve hizmetler" accent="violet" wide>
        {profile.companyDescription.trim() ? (
          <p className="admin-corp-prose">{profile.companyDescription.trim()}</p>
        ) : (
          <p className="admin-corp-prose admin-corp-prose--muted">Firma tanımı henüz yok.</p>
        )}
        {services.length > 0 ? (
          <ul className="admin-corp-service-tags" aria-label="Hizmetler">
            {services.map((tag) => (
              <li key={tag}>{tag}</li>
            ))}
          </ul>
        ) : profile.servicesSummary.trim() ? (
          <p className="admin-corp-prose admin-corp-prose--small">
            {profile.servicesSummary}
          </p>
        ) : null}
        {profile.websiteEnrichmentCompletedAt ? (
          <p className="admin-corp-scan-meta">
            Son web taraması{" "}
            <time dateTime={profile.websiteEnrichmentCompletedAt}>
              {new Date(profile.websiteEnrichmentCompletedAt).toLocaleString("tr-TR")}
            </time>
          </p>
        ) : null}
      </CorpBlock>

      <CorpBlock title="Sosyal ağlar" accent="teal" wide className="admin-corp-block--social">
        <div
          className="admin-corp-social-icons social-media-row"
          role="list"
          aria-label="Sosyal medya profilleri"
        >
          {SOCIAL_PLATFORMS.map(({ id, urlKey }) => (
            <SocialPlatformIconLink
              key={id}
              id={id}
              href={String(profile[urlKey] ?? "")}
            />
          ))}
        </div>
        {!hasAnySocial ? (
          <p className="admin-corp-social-empty">Kayıtlı sosyal profil bağlantısı yok.</p>
        ) : null}
        {hasInstagramUrl ? (
          <div className="admin-corp-ig-panel">
            <div className="admin-corp-ig-metrics">
              <InstagramMetric label="Gönderi" value={profile.instagramPostsCount} />
              <InstagramMetric label="Takipçi" value={profile.instagramFollowersCount} />
              <InstagramMetric label="Takip" value={profile.instagramFollowingCount} />
            </div>
          </div>
        ) : null}
        {profile.instagramStatsNote ? (
          <p className="admin-corp-scan-meta admin-corp-scan-meta--note">
            {profile.instagramStatsNote}
          </p>
        ) : null}
      </CorpBlock>
    </div>
  );
}
