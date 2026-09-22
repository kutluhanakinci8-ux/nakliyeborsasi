import type { OrganizationProfile } from "../../lib/organizationProfile";
import { formatParticipantType } from "../../lib/PlatformAdminApiClient";

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
}: {
  label: string;
  value: string;
  href?: string;
}) {
  const shown = displayValue(value);
  return (
    <div className="admin-corp-dl-row">
      <dt>{label}</dt>
      <dd>
        {href && value.trim() ? (
          <a href={href} target="_blank" rel="noreferrer">{shown}</a>
        ) : (
          shown
        )}
      </dd>
    </div>
  );
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

  return (
    <header className="admin-corp-hero">
      <div className="admin-corp-hero-brand">
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
        <div className="admin-corp-hero-titles">
          <p className="admin-corp-hero-eyebrow">Kurumsal profil</p>
          <h2 className="admin-corp-hero-title">{title}</h2>
          {subtitle && subtitle !== title ? (
            <p className="admin-corp-hero-subtitle">{subtitle}</p>
          ) : null}
          <div className="admin-corp-hero-pills">
            <span className="admin-org-badge">
              {formatParticipantType(company?.participantTypeCode ?? null)}
            </span>
            <span className="admin-org-badge">
              {company?.userCount ?? 0} kullanıcı
            </span>
            <span className="admin-org-badge">
              {company?.listingCount ?? 0} ilan
            </span>
            {profile.countryCode ? (
              <span className="admin-org-badge">{profile.countryCode}</span>
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
          <p className="admin-corp-hero-line">
            <span className="admin-corp-hero-icon" aria-hidden>⌖</span>
            {profile.addressLine}
            {profile.city.trim() ? ` · ${profile.city}` : ""}
          </p>
        ) : profile.city.trim() ? (
          <p className="admin-corp-hero-line">
            <span className="admin-corp-hero-icon" aria-hidden>⌖</span>
            {profile.city}
          </p>
        ) : null}
        <p className="admin-corp-hero-line admin-corp-hero-line--meta">
          {profile.primaryEmail.trim() ? (
            <span>{profile.primaryEmail}</span>
          ) : null}
          {profile.phone.trim() ? <span>{profile.phone}</span> : null}
          {profile.whatsappNumber.trim() ? (
            <span>WA {profile.whatsappNumber}</span>
          ) : null}
          {profile.website.trim() ? (
            <a href={profile.website} target="_blank" rel="noreferrer">
              Web sitesi
            </a>
          ) : null}
        </p>
        <p className="admin-corp-hero-id">
          Firma kimliği: <code>{company?.id ?? "—"}</code>
        </p>
      </div>
    </header>
  );
}

export function AdminCorporateProfileOverview({
  profile,
}: {
  profile: OrganizationProfile;
}) {
  return (
    <div className="admin-corp-overview">
      <section className="admin-corp-block">
        <h3 className="admin-corp-block-title">Kimlik ve vergi</h3>
        <dl className="admin-corp-dl">
          <ReadonlyRow label="Ticari unvan" value={profile.tradeName} />
          <ReadonlyRow label="Resmi unvan" value={profile.legalName} />
          <ReadonlyRow label="Vergi / TIN" value={profile.taxNumber} />
          <ReadonlyRow label="MERSİS" value={profile.mersisNumber} />
          <ReadonlyRow label="Vergi dairesi" value={profile.taxOfficeLine} />
          <ReadonlyRow label="Şehir" value={profile.city} />
          <ReadonlyRow label="Ülke" value={profile.countryCode} />
        </dl>
      </section>
      <section className="admin-corp-block">
        <h3 className="admin-corp-block-title">İletişim</h3>
        <dl className="admin-corp-dl">
          <ReadonlyRow label="E-posta" value={profile.primaryEmail} />
          <ReadonlyRow label="Telefon" value={profile.phone} />
          <ReadonlyRow label="WhatsApp" value={profile.whatsappNumber} />
          <ReadonlyRow label="Web" value={profile.website} href={profile.website} />
          <ReadonlyRow label="KEP" value={profile.kepAddress} />
        </dl>
      </section>
      <section className="admin-corp-block">
        <h3 className="admin-corp-block-title">Kayıt ve yetki</h3>
        <dl className="admin-corp-dl">
          <ReadonlyRow label="Ticaret sicil" value={profile.tradeRegistryNumber} />
          <ReadonlyRow
            label="Ulaştırma yetki belgesi"
            value={profile.transportLicenseNumber}
          />
          <ReadonlyRow label="Çalışma saatleri" value={profile.workingHours} />
        </dl>
      </section>
      <section className="admin-corp-block admin-corp-block--wide">
        <h3 className="admin-corp-block-title">Web ve hizmetler</h3>
        <dl className="admin-corp-dl">
          <ReadonlyRow label="Açık adres" value={profile.addressLine} />
          <ReadonlyRow label="Firma tanımı" value={profile.companyDescription} />
          <ReadonlyRow label="Hizmet özetleri" value={profile.servicesSummary} />
        </dl>
        {profile.websiteEnrichmentCompletedAt ? (
          <p className="admin-org-enrichment-meta">
            Son web taraması:{" "}
            {new Date(profile.websiteEnrichmentCompletedAt).toLocaleString("tr-TR")}
          </p>
        ) : null}
      </section>
      <section className="admin-corp-block admin-corp-block--wide">
        <h3 className="admin-corp-block-title">Sosyal medya</h3>
        <dl className="admin-corp-dl admin-corp-dl--social">
          <ReadonlyRow label="Instagram" value={profile.instagramUrl} href={profile.instagramUrl} />
          <ReadonlyRow label="Gönderi" value={profile.instagramPostsCount} />
          <ReadonlyRow label="Takipçi" value={profile.instagramFollowersCount} />
          <ReadonlyRow label="Takip" value={profile.instagramFollowingCount} />
          <ReadonlyRow label="Facebook" value={profile.facebookUrl} href={profile.facebookUrl} />
          <ReadonlyRow label="X" value={profile.twitterUrl} href={profile.twitterUrl} />
          <ReadonlyRow label="YouTube" value={profile.youtubeUrl} href={profile.youtubeUrl} />
          <ReadonlyRow label="LinkedIn" value={profile.linkedinUrl} href={profile.linkedinUrl} />
        </dl>
        {profile.instagramStatsNote ? (
          <p className="admin-org-enrichment-meta">{profile.instagramStatsNote}</p>
        ) : null}
      </section>
    </div>
  );
}
