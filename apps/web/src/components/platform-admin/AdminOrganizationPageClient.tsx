"use client";

import { useSearchParams } from "next/navigation";
import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  addManualCompanyId,
  loadManualCompanyIds,
  removeManualCompanyId,
} from "../../lib/adminCompanyDirectory";
import {
  PlatformAdminApiClient,
  formatParticipantType,
} from "../../lib/PlatformAdminApiClient";
import {
  CORRIDOR_OPTIONS,
  appendOrganizationAudit,
  defaultAdminSettings,
  defaultOrganizationProfile,
  loadOrganizationAdminSettings,
  clearOrganizationLocalData,
  loadOrganizationAudit,
  loadOrganizationLogoUrl,
  loadOrganizationProfile,
  saveOrganizationAdminSettings,
  saveOrganizationProfile,
  type OrganizationAdminSettings,
  type OrganizationAuditEntry,
  type OrganizationProfile,
} from "../../lib/organizationProfile";
import { AuthApiClient } from "../../lib/AuthApiClient";
import {
  buildInstagramCaptureBookmarkletHref,
  isInstagramStatsCaptureMessage,
  isTrustedInstagramMessageOrigin,
  normalizeInstagramCountLabel,
  openInstagramProfileForCapture,
  parseInstagramStatsFromText,
} from "../../lib/instagramBrowserCapture";
import { refreshInstagramStatsForOrganization } from "../../lib/instagramStatsWorkflow";
import { useWebSession } from "../../context/WebSessionProvider";
import { AdminDonutChart } from "./AdminDashboardCharts";
import {
  AdminCorporateProfileHero,
  AdminCorporateProfileOverview,
} from "./AdminOrganizationProfileUi";
import { OrganizationSwipeListItem } from "./OrganizationSwipeListItem";
import type { OrgAction, OrgEditSection } from "./organizationTypes";

type ApiCompany = Awaited<
  ReturnType<typeof PlatformAdminApiClient.fetchCompanies>
>[number];

type TypeFilter = "all" | "LOAD_SHIPPER" | "LOAD_CARRIER" | "LOAD_SEEKER" | "other";

function participantKey(code: string | null): TypeFilter {
  if (code === "LOAD_SHIPPER" || code === "LOAD_CARRIER" || code === "LOAD_SEEKER") {
    return code;
  }
  return "other";
}

export function AdminOrganizationPageClient() {
  const searchParams = useSearchParams();
  const firmaFromQuery = searchParams.get("firma");
  const { session, accessToken } = useWebSession();
  const actorEmail = session?.emailAddress ?? "admin";
  const [companies, setCompanies] = useState<ApiCompany[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [profile, setProfile] = useState<OrganizationProfile>(() =>
    defaultOrganizationProfile(""),
  );
  const [adminSettings, setAdminSettings] = useState<OrganizationAdminSettings>(
    defaultAdminSettings(),
  );
  const [auditLog, setAuditLog] = useState<OrganizationAuditEntry[]>([]);
  const [filter, setFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [manualId, setManualId] = useState("");
  const [message, setMessage] = useState("");
  const [activeAction, setActiveAction] = useState<OrgAction | null>(null);
  const [editSection, setEditSection] = useState<OrgEditSection>("overview");
  const [isProfileEditing, setIsProfileEditing] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [loading, setLoading] = useState(true);
  const [swipeOpenId, setSwipeOpenId] = useState<string | null>(null);
  const [isRefreshingInstagramStats, setIsRefreshingInstagramStats] =
    useState(false);
  const [instagramGraphConfigured, setInstagramGraphConfigured] = useState(false);
  const [instagramPasteBuffer, setInstagramPasteBuffer] = useState("");
  const actionPanelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    void AuthApiClient.fetchInstagramGraphStatus().then((status) => {
      setInstagramGraphConfigured(status.configured);
    });
  }, []);

  useEffect(() => {
    function onInstagramCaptureMessage(event: MessageEvent): void {
      if (!isTrustedInstagramMessageOrigin(event.origin)) {
        return;
      }
      if (!isInstagramStatsCaptureMessage(event.data)) {
        return;
      }
      applyInstagramParsedStats(event.data, "Yer imi ile Instagram sayfasından okundu");
    }
    window.addEventListener("message", onInstagramCaptureMessage);
    return () => window.removeEventListener("message", onInstagramCaptureMessage);
  }, []);

  const refreshDirectory = useCallback(async () => {
    if (!accessToken) {
      return;
    }
    setLoading(true);
    try {
      const apiCompanies = await PlatformAdminApiClient.fetchCompanies(accessToken);
      const map = new Map(apiCompanies.map((c) => [c.id, c]));
      for (const id of loadManualCompanyIds()) {
        if (!map.has(id)) {
          map.set(id, {
            id,
            legalName: `Manuel kayıt · ${id.slice(0, 8)}`,
            countryCode: "—",
            participantTypeCode: null,
            userCount: 0,
            listingCount: 0,
            activePlanCode: null,
          });
        }
      }
      const list = [...map.values()].sort((a, b) =>
        a.legalName.localeCompare(b.legalName, "tr"),
      );
      setCompanies(list);
      setSelectedId((current) => current || list[0]?.id || "");
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    void refreshDirectory();
  }, [refreshDirectory]);

  useEffect(() => {
    if (firmaFromQuery) {
      setSelectedId(firmaFromQuery);
    }
  }, [firmaFromQuery]);

  useEffect(() => {
    setActiveAction(null);
    setDeleteConfirm("");
    setIsProfileEditing(false);
    setEditSection("overview");
  }, [selectedId]);

  useEffect(() => {
    if (!activeAction || !actionPanelRef.current) {
      return;
    }
    actionPanelRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [activeAction, selectedId]);

  const selectedCompany = companies.find((c) => c.id === selectedId);

  useEffect(() => {
    if (!selectedId) {
      return;
    }
    const loadedProfile = loadOrganizationProfile(selectedId, "");
    const apiName = selectedCompany?.legalName ?? "";
    setProfile({
      ...loadedProfile,
      tradeName: loadedProfile.tradeName || apiName,
      legalName: loadedProfile.legalName || apiName,
    });
    setAdminSettings(loadOrganizationAdminSettings(selectedId));
    setAuditLog(loadOrganizationAudit(selectedId));
  }, [selectedId, selectedCompany?.legalName]);

  const summary = useMemo(() => {
    let frozen = 0;
    let pendingDocs = 0;
    let verified = 0;
    const breakdown = { loadShipper: 0, loadCarrier: 0, loadSeeker: 0, other: 0 };
    for (const company of companies) {
      const settings = loadOrganizationAdminSettings(company.id);
      if (settings.accountFrozen) {
        frozen++;
      }
      if (settings.documentStatus === "pending") {
        pendingDocs++;
      }
      if (settings.emailVerified && settings.documentStatus === "approved") {
        verified++;
      }
      switch (company.participantTypeCode) {
        case "LOAD_SHIPPER":
          breakdown.loadShipper++;
          break;
        case "LOAD_CARRIER":
          breakdown.loadCarrier++;
          break;
        case "LOAD_SEEKER":
          breakdown.loadSeeker++;
          break;
        default:
          breakdown.other++;
      }
    }
    return { frozen, pendingDocs, verified, breakdown };
  }, [companies]);

  const donutSegments = useMemo(
    () =>
      [
        { label: "Yük veren", value: summary.breakdown.loadShipper, color: "#0d9488" },
        { label: "Yük taşıyan", value: summary.breakdown.loadCarrier, color: "#2563eb" },
        { label: "Yük arayan", value: summary.breakdown.loadSeeker, color: "#d97706" },
        { label: "Diğer", value: summary.breakdown.other, color: "#64748b" },
      ].filter((s) => s.value > 0),
    [summary.breakdown],
  );

  function flash(text: string): void {
    setMessage(text);
    window.setTimeout(() => setMessage(""), 4000);
  }

  function applyInstagramParsedStats(
    parsed: { posts: string; followers: string; following: string },
    note: string,
  ): void {
    if (!selectedId) {
      return;
    }
    setProfile((current) => {
      const next = {
        ...current,
        instagramPostsCount:
          normalizeInstagramCountLabel(parsed.posts) || current.instagramPostsCount,
        instagramFollowersCount:
          normalizeInstagramCountLabel(parsed.followers) ||
          current.instagramFollowersCount,
        instagramFollowingCount:
          normalizeInstagramCountLabel(parsed.following) ||
          current.instagramFollowingCount,
        instagramStatsFetchedAt: new Date().toISOString(),
        instagramStatsNote: note,
      };
      saveOrganizationProfile(selectedId, next);
      return next;
    });
    flash("Instagram sayıları kaydedildi.");
  }

  function startProfileEdit(section: OrgEditSection = "profile"): void {
    setIsProfileEditing(true);
    if (section !== "overview" && section !== "audit") {
      setEditSection(section);
    }
  }

  function commitProfileEdits(): void {
    saveAll("Operatör profil düzenlemesi kaydedildi.");
    setIsProfileEditing(false);
    setEditSection("overview");
  }

  function cancelProfileEdits(): void {
    if (selectedId) {
      setProfile(loadOrganizationProfile(selectedId, profile.primaryEmail));
    }
    setIsProfileEditing(false);
    setEditSection("overview");
    flash("Düzenleme iptal edildi.");
  }

  function handleParseInstagramPaste(): void {
    const parsed = parseInstagramStatsFromText(instagramPasteBuffer);
    if (!parsed) {
      flash(
        "Metinde gönderi/takipçi bulunamadı. Örn: 208 gönderi 13,9 B takipçi 1 takip",
      );
      return;
    }
    applyInstagramParsedStats(parsed, "Profil metninden yapıştırıldı");
  }

  async function handleRefreshInstagramStats(): Promise<void> {
    if (!selectedId || !profile.instagramUrl.trim()) {
      flash("Önce Instagram profil adresini girin.");
      return;
    }
    setIsRefreshingInstagramStats(true);
    const outcome = await refreshInstagramStatsForOrganization(
      selectedId,
      profile.primaryEmail,
      profile.instagramUrl,
      true,
    );
    setProfile(loadOrganizationProfile(selectedId, profile.primaryEmail));
    setIsRefreshingInstagramStats(false);
    if (outcome === "success") {
      flash("Instagram istatistikleri güncellendi.");
    } else if (outcome === "partial") {
      flash(
        "Instagram otomatik alınamadı; sayıları elle girebilir veya notu okuyun.",
      );
    } else {
      flash("Instagram istatistik isteği başarısız.");
    }
  }

  function saveAll(summaryText: string): void {
    if (!selectedId) {
      return;
    }
    const nextAdmin: OrganizationAdminSettings = {
      ...adminSettings,
      updatedAt: new Date().toISOString(),
      updatedBy: actorEmail,
    };
    saveOrganizationProfile(selectedId, profile);
    saveOrganizationAdminSettings(selectedId, nextAdmin);
    appendOrganizationAudit(selectedId, actorEmail, summaryText);
    setAdminSettings(nextAdmin);
    setAuditLog(loadOrganizationAudit(selectedId));
    flash(summaryText);
  }

  function handleProfileSubmit(event: FormEvent): void {
    event.preventDefault();
    commitProfileEdits();
  }

  function handleAdminSubmit(event: FormEvent): void {
    event.preventDefault();
    saveAll("Doğrulama ve operasyon ayarları kaydedildi.");
  }

  function toggleCorridor(code: string): void {
    setProfile((current) => {
      const has = current.corridors.includes(code);
      const corridors = has
        ? current.corridors.filter((c) => c !== code)
        : [...current.corridors, code];
      return { ...current, corridors };
    });
  }

  function addCompany(): void {
    const id = manualId.trim();
    if (!id) {
      return;
    }
    addManualCompanyId(id);
    setManualId("");
    void refreshDirectory().then(() => setSelectedId(id));
    flash("Firma dizine eklendi.");
  }

  function selectCompany(id: string): void {
    setSelectedId(id);
    setActiveAction(null);
    setSwipeOpenId(null);
  }

  function pickAction(companyId: string, action: OrgAction): void {
    setSelectedId(companyId);
    setActiveAction(action);
    setSwipeOpenId(null);
    if (action === "edit") {
      setEditSection("overview");
      setIsProfileEditing(false);
    }
  }

  function renderEditSectionGate(section: OrgEditSection, title: string): ReactNode {
    if (isProfileEditing) {
      return null;
    }
    return (
      <section className="admin-panel-card admin-corp-edit-gate">
        <h2 className="admin-corp-block-title">{title}</h2>
        <p className="admin-corp-edit-gate-lead">
          Bilgiler üye hesabı ve web taramasından otomatik gelir. Değiştirmek için düzenleme
          modunu açın.
        </p>
        <button
          type="button"
          className="admin-btn-secondary"
          onClick={() => startProfileEdit(section)}
        >
          Bu bölümü düzenle
        </button>
      </section>
    );
  }

  function handleClearLocalData(): void {
    if (!selectedId) {
      return;
    }
    if (deleteConfirm !== "SIL") {
      flash('Onay için kutuya "SIL" yazın.');
      return;
    }
    clearOrganizationLocalData(selectedId);
    removeManualCompanyId(selectedId);
    const remaining = companies.filter((c) => c.id !== selectedId);
    flash("Yerel operatör verileri temizlendi (API kaydı durur).");
    setDeleteConfirm("");
    setActiveAction(null);
    void refreshDirectory().then(() => setSelectedId(remaining[0]?.id ?? ""));
  }

  function renderOrgActionPanels() {
    if (!activeAction) {
      return null;
    }

    return (
      <div className="admin-org-action-panel">
        {activeAction === "restrict" ? (
          <form className="admin-panel-card" onSubmit={handleAdminSubmit}>
            <header className="admin-panel-card-head">
              <div>
                <h2>Kısıtlama ve doğrulama</h2>
                <p>Rozetler, izinler ve hesap dondurma</p>
              </div>
              <button type="submit" className="admin-btn-primary">Kaydet</button>
            </header>
            <div className="admin-form-grid">
              <label className="admin-checkbox">
                <input
                  type="checkbox"
                  checked={adminSettings.emailVerified}
                  onChange={(event) =>
                    setAdminSettings((c) => ({
                      ...c,
                      emailVerified: event.target.checked,
                    }))
                  }
                />
                E-posta onaylı
              </label>
              <label className="admin-field">
                <span>Belge durumu</span>
                <select
                  className="admin-input"
                  value={adminSettings.documentStatus}
                  onChange={(event) =>
                    setAdminSettings((c) => ({
                      ...c,
                      documentStatus: event.target
                        .value as OrganizationAdminSettings["documentStatus"],
                    }))
                  }
                >
                  <option value="pending">Bekleniyor</option>
                  <option value="approved">Onaylı</option>
                  <option value="rejected">Reddedildi</option>
                </select>
              </label>
              <label className="admin-field">
                <span>Doğrulama seviyesi</span>
                <select
                  className="admin-input"
                  value={adminSettings.verificationLevel}
                  onChange={(event) =>
                    setAdminSettings((c) => ({
                      ...c,
                      verificationLevel: event.target.value as "basic" | "full",
                    }))
                  }
                >
                  <option value="basic">Temel</option>
                  <option value="full">Tam</option>
                </select>
              </label>
              <label className="admin-field">
                <span>Destek kayıt no</span>
                <input
                  className="admin-input"
                  value={adminSettings.supportTicketRef}
                  onChange={(event) =>
                    setAdminSettings((c) => ({
                      ...c,
                      supportTicketRef: event.target.value,
                    }))
                  }
                />
              </label>
              <label className="admin-field admin-field--span-2">
                <span>Admin notu</span>
                <textarea
                  className="admin-input admin-textarea"
                  rows={3}
                  value={adminSettings.adminNotes}
                  onChange={(event) =>
                    setAdminSettings((c) => ({
                      ...c,
                      adminNotes: event.target.value,
                    }))
                  }
                />
              </label>
            </div>
            <div className="admin-toggle-row">
              <label className="admin-checkbox">
                <input
                  type="checkbox"
                  checked={adminSettings.featuredInSearch}
                  onChange={(event) =>
                    setAdminSettings((c) => ({
                      ...c,
                      featuredInSearch: event.target.checked,
                    }))
                  }
                />
                Öne çıkan arama
              </label>
              <label className="admin-checkbox">
                <input
                  type="checkbox"
                  checked={adminSettings.allowNewListings}
                  onChange={(event) =>
                    setAdminSettings((c) => ({
                      ...c,
                      allowNewListings: event.target.checked,
                    }))
                  }
                />
                Yeni ilan izni
              </label>
              <label className="admin-checkbox">
                <input
                  type="checkbox"
                  checked={adminSettings.allowAuctions}
                  onChange={(event) =>
                    setAdminSettings((c) => ({
                      ...c,
                      allowAuctions: event.target.checked,
                    }))
                  }
                />
                İhale izni
              </label>
              <label className="admin-checkbox admin-checkbox--danger">
                <input
                  type="checkbox"
                  checked={adminSettings.accountFrozen}
                  onChange={(event) =>
                    setAdminSettings((c) => ({
                      ...c,
                      accountFrozen: event.target.checked,
                    }))
                  }
                />
                Hesabı dondur
              </label>
            </div>
          </form>
        ) : null}

        {activeAction === "edit" ? (
          <>
            <AdminCorporateProfileHero
              profile={profile}
              company={selectedCompany}
              isEditing={isProfileEditing}
              onStartEdit={() => startProfileEdit("profile")}
              onSave={commitProfileEdits}
              onCancelEdit={cancelProfileEdits}
            />
            <nav className="admin-org-edit-tabs" aria-label="Düzenleme bölümleri">
            {(
              [
                ["overview", "Kurumsal özet"],
                ["profile", "Temel"],
                ["web", "Web taraması"],
                ["compliance", "Resmi kayıt"],
                ["contact", "İletişim"],
                ["social", "Sosyal medya"],
                ["corridor", "Koridor"],
                ["audit", "Denetim"],
              ] as [OrgEditSection, string][]
            ).map(([section, label]) => (
              <button
                key={section}
                type="button"
                className={
                  editSection === section
                    ? "admin-org-type-chip active"
                    : "admin-org-type-chip"
                }
                onClick={() => setEditSection(section)}
              >
                {label}
              </button>
            ))}
          </nav>
          </>
        ) : null}

        {activeAction === "edit" && editSection === "overview" ? (
          <section className="admin-panel-card admin-corp-overview-card">
            <AdminCorporateProfileOverview profile={profile} />
            <p className="admin-corp-view-hint admin-corp-view-hint--footer">
              Kayıtlı veriler üye organizasyonu ve web taramasından gelir. Düzenleme için üstte{" "}
              <strong>Profili düzenle</strong>.
            </p>
          </section>
        ) : null}

        {activeAction === "edit" &&
          editSection === "profile" &&
          !isProfileEditing &&
          renderEditSectionGate("profile", "Temel bilgiler")}

        {activeAction === "edit" && editSection === "profile" && isProfileEditing ? (
          <form className="admin-panel-card" onSubmit={handleProfileSubmit}>
            <header className="admin-panel-card-head">
              <div>
                <h2>Temel bilgiler</h2>
                <p>Ticari ve resmi unvan</p>
              </div>
            </header>
            <div className="admin-form-grid">
              <label className="admin-field">
                <span>Ticari unvan</span>
                <input
                  className="admin-input"
                  value={profile.tradeName}
                  onChange={(event) =>
                    setProfile((c) => ({ ...c, tradeName: event.target.value }))
                  }
                />
              </label>
              <label className="admin-field">
                <span>Resmi unvan</span>
                <input
                  className="admin-input"
                  value={profile.legalName}
                  onChange={(event) =>
                    setProfile((c) => ({ ...c, legalName: event.target.value }))
                  }
                />
              </label>
              <label className="admin-field">
                <span>Vergi / TIN</span>
                <input
                  className="admin-input"
                  value={profile.taxNumber}
                  onChange={(event) =>
                    setProfile((c) => ({ ...c, taxNumber: event.target.value }))
                  }
                />
              </label>
              <label className="admin-field">
                <span>Ülke</span>
                <select
                  className="admin-input"
                  value={profile.countryCode}
                  onChange={(event) =>
                    setProfile((c) => ({ ...c, countryCode: event.target.value }))
                  }
                >
                  <option value="TR">TR</option>
                  <option value="UA">UA</option>
                  <option value="PL">PL</option>
                  <option value="DE">DE</option>
                  <option value="RO">RO</option>
                </select>
              </label>
              <label className="admin-field admin-field--span-2">
                <span>Şehir</span>
                <input
                  className="admin-input"
                  value={profile.city}
                  onChange={(event) =>
                    setProfile((c) => ({ ...c, city: event.target.value }))
                  }
                />
              </label>
            </div>
          </form>
        ) : null}

        {activeAction === "edit" &&
          editSection === "web" &&
          !isProfileEditing &&
          renderEditSectionGate("web", "Web taraması")}

        {activeAction === "edit" && editSection === "web" && isProfileEditing ? (
          <form className="admin-panel-card" onSubmit={handleProfileSubmit}>
            <header className="admin-panel-card-head">
              <div>
                <h2>Web sitesinden alınan bilgiler</h2>
                <p>Üye hesabında otomatik tarama ile doldurulan alanlar</p>
              </div>
            </header>
            <div className="admin-org-logo-row">
              {profile.logoUrl ? (
                <img
                  src={profile.logoUrl}
                  alt=""
                  className="admin-org-logo-preview"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="admin-org-logo-preview admin-org-logo-preview--empty">
                  Logo yok
                </div>
              )}
              <label className="admin-field admin-field--grow">
                <span>Logo URL</span>
                <input
                  className="admin-input"
                  value={profile.logoUrl}
                  onChange={(event) =>
                    setProfile((c) => ({ ...c, logoUrl: event.target.value }))
                  }
                />
              </label>
            </div>
            <div className="admin-form-grid">
              <label className="admin-field admin-field--span-2">
                <span>Firma tanımı (meta)</span>
                <textarea
                  className="admin-input admin-textarea"
                  rows={2}
                  value={profile.companyDescription}
                  onChange={(event) =>
                    setProfile((c) => ({
                      ...c,
                      companyDescription: event.target.value,
                    }))
                  }
                />
              </label>
              <label className="admin-field admin-field--span-2">
                <span>Açık adres</span>
                <input
                  className="admin-input"
                  value={profile.addressLine}
                  onChange={(event) =>
                    setProfile((c) => ({ ...c, addressLine: event.target.value }))
                  }
                />
              </label>
              <label className="admin-field">
                <span>Çalışma saatleri</span>
                <input
                  className="admin-input"
                  value={profile.workingHours}
                  onChange={(event) =>
                    setProfile((c) => ({
                      ...c,
                      workingHours: event.target.value,
                    }))
                  }
                />
              </label>
              <label className="admin-field admin-field--span-2">
                <span>Hizmet alanları (özet)</span>
                <textarea
                  className="admin-input admin-textarea"
                  rows={2}
                  value={profile.servicesSummary}
                  onChange={(event) =>
                    setProfile((c) => ({
                      ...c,
                      servicesSummary: event.target.value,
                    }))
                  }
                />
              </label>
            </div>
            {profile.websiteEnrichmentCompletedAt ? (
              <p className="admin-org-enrichment-meta">
                Son tarama:{" "}
                {new Date(profile.websiteEnrichmentCompletedAt).toLocaleString("tr-TR")}
              </p>
            ) : null}
            {profile.websiteScannedUrls ? (
              <p className="admin-org-enrichment-meta">
                Taranan sayfalar:{" "}
                <code>{profile.websiteScannedUrls.replace(/\n/g, " · ")}</code>
              </p>
            ) : null}
          </form>
        ) : null}

        {activeAction === "edit" &&
          editSection === "compliance" &&
          !isProfileEditing &&
          renderEditSectionGate("compliance", "Resmi kayıt")}

        {activeAction === "edit" && editSection === "compliance" && isProfileEditing ? (
          <form className="admin-panel-card" onSubmit={handleProfileSubmit}>
            <header className="admin-panel-card-head">
              <div>
                <h2>Resmi kayıt ve uyum</h2>
                <p>MERSİS, vergi, sicil, yetki belgesi, KEP</p>
              </div>
            </header>
            <div className="admin-form-grid">
              <label className="admin-field">
                <span>MERSİS numarası</span>
                <input
                  className="admin-input"
                  value={profile.mersisNumber}
                  onChange={(event) =>
                    setProfile((c) => ({ ...c, mersisNumber: event.target.value }))
                  }
                />
              </label>
              <label className="admin-field">
                <span>Vergi dairesi / no (satır)</span>
                <input
                  className="admin-input"
                  value={profile.taxOfficeLine}
                  onChange={(event) =>
                    setProfile((c) => ({
                      ...c,
                      taxOfficeLine: event.target.value,
                    }))
                  }
                />
              </label>
              <label className="admin-field">
                <span>Ticaret sicil no</span>
                <input
                  className="admin-input"
                  value={profile.tradeRegistryNumber}
                  onChange={(event) =>
                    setProfile((c) => ({
                      ...c,
                      tradeRegistryNumber: event.target.value,
                    }))
                  }
                />
              </label>
              <label className="admin-field">
                <span>Ulaştırma yetki belge no</span>
                <input
                  className="admin-input"
                  value={profile.transportLicenseNumber}
                  onChange={(event) =>
                    setProfile((c) => ({
                      ...c,
                      transportLicenseNumber: event.target.value,
                    }))
                  }
                />
              </label>
              <label className="admin-field admin-field--span-2">
                <span>KEP adresi</span>
                <input
                  className="admin-input"
                  value={profile.kepAddress}
                  onChange={(event) =>
                    setProfile((c) => ({ ...c, kepAddress: event.target.value }))
                  }
                />
              </label>
            </div>
          </form>
        ) : null}

        {activeAction === "edit" && editSection === "corridor" && !isProfileEditing ? (
          <section className="admin-panel-card">
            <header className="admin-panel-card-head">
              <div>
                <h2>Koridor yetkileri</h2>
                <p>TR · UA · EU erişimleri</p>
              </div>
              <button
                type="button"
                className="admin-btn-secondary"
                onClick={() => startProfileEdit("corridor")}
              >
                Düzenle
              </button>
            </header>
            <p className="admin-corp-corridor-readonly">
              {profile.corridors.length > 0
                ? profile.corridors.join(" · ")
                : "—"}
            </p>
          </section>
        ) : null}

        {activeAction === "edit" && editSection === "corridor" && isProfileEditing ? (
          <section className="admin-panel-card">
            <header className="admin-panel-card-head">
              <div>
                <h2>Koridor yetkileri</h2>
                <p>TR · UA · EU erişimleri</p>
              </div>
            </header>
            <div className="account-corridor-toggles">
              {CORRIDOR_OPTIONS.map((corridor) => {
                const active = profile.corridors.includes(corridor.code);
                return (
                  <button
                    key={corridor.code}
                    type="button"
                    className={
                      active ? "account-corridor-chip active" : "account-corridor-chip"
                    }
                    onClick={() => toggleCorridor(corridor.code)}
                  >
                    <span className="account-corridor-code">{corridor.code}</span>
                    <span>{corridor.label}</span>
                  </button>
                );
              })}
            </div>
          </section>
        ) : null}

        {activeAction === "edit" &&
          editSection === "contact" &&
          !isProfileEditing &&
          renderEditSectionGate("contact", "İletişim")}

        {activeAction === "edit" && editSection === "contact" && isProfileEditing ? (
          <form className="admin-panel-card" onSubmit={handleProfileSubmit}>
            <header className="admin-panel-card-head">
              <div>
                <h2>Birincil iletişim</h2>
                <p>E-posta, telefon, WhatsApp ve web</p>
              </div>
            </header>
            <div className="admin-form-grid">
              <label className="admin-field admin-field--span-2">
                <span>Birincil e-posta</span>
                <input
                  className="admin-input"
                  type="email"
                  value={profile.primaryEmail}
                  onChange={(event) =>
                    setProfile((c) => ({ ...c, primaryEmail: event.target.value }))
                  }
                />
              </label>
              <label className="admin-field">
                <span>Operasyon telefonu</span>
                <input
                  className="admin-input"
                  value={profile.phone}
                  onChange={(event) =>
                    setProfile((c) => ({ ...c, phone: event.target.value }))
                  }
                />
              </label>
              <label className="admin-field">
                <span>WhatsApp</span>
                <input
                  className="admin-input"
                  value={profile.whatsappNumber}
                  onChange={(event) =>
                    setProfile((c) => ({
                      ...c,
                      whatsappNumber: event.target.value,
                    }))
                  }
                />
              </label>
              <label className="admin-field admin-field--span-2">
                <span>Web sitesi</span>
                <input
                  className="admin-input"
                  value={profile.website}
                  onChange={(event) =>
                    setProfile((c) => ({ ...c, website: event.target.value }))
                  }
                />
              </label>
            </div>
          </form>
        ) : null}

        {activeAction === "edit" &&
          editSection === "social" &&
          !isProfileEditing &&
          renderEditSectionGate("social", "Sosyal medya")}

        {activeAction === "edit" && editSection === "social" && isProfileEditing ? (
          <form className="admin-panel-card" onSubmit={handleProfileSubmit}>
            <header className="admin-panel-card-head">
              <div>
                <h2>Sosyal medya</h2>
                <p>Web taramasından ayrı platform adresleri</p>
              </div>
            </header>
            <div className="admin-social-connection-panel">
              <p className="admin-social-connection-title">
                Platform Instagram (Meta Graph)
              </p>
              <p className="admin-social-connection-lead">
                Kendi Instagram Business hesabınızı Meta üzerinden bağladığınızda
                gönderi ve takipçi sayıları güvenilir şekilde çekilir (anonim
                tarama yerine).
              </p>
              <div className="admin-social-connection-status">
                <span
                  className={
                    instagramGraphConfigured
                      ? "admin-org-badge admin-org-badge--ok"
                      : "admin-org-badge admin-org-badge--warn"
                  }
                >
                  {instagramGraphConfigured
                    ? "Sunucuda Meta token yapılandırıldı"
                    : "Henüz bağlı değil — API ortam değişkenleri gerekli"}
                </span>
                <a
                  className="admin-social-connection-link"
                  href="https://github.com/kutluhanakinci8-ux/nakliyeborsasi/blob/cursor/modular-freight-platform-18ba/docs/SOCIAL_MEDIA_CONNECTION.md"
                  target="_blank"
                  rel="noreferrer"
                >
                  Bağlantı kılavuzu
                </a>
              </div>
              <p className="admin-social-connection-hint">
                Sonraki adım: her firma için &quot;Instagram Business bağla&quot;
                (OAuth) — şimdilik platform jetonu veya manuel sayı girişi.
              </p>
            </div>
            <div className="admin-social-connection-panel admin-social-connection-panel--browser">
              <p className="admin-social-connection-title">
                API olmadan — tarayıcıda Instagram (önerilen geçici çözüm)
              </p>
              <p className="admin-social-connection-lead">
                Instagram ve Facebook, panel içine gömülü girişe izin vermez. Kendi
                hesabınızla tarayıcıda profili açıp tek tıkla sayıları panele
                aktarabilirsiniz (firma adresi zaten kayıtlı).
              </p>
              <ol className="admin-social-browser-steps">
                <li>
                  Aşağıdaki yer imini sık kullanılanlara sürükleyin:{" "}
                  <a
                    className="admin-social-bookmarklet"
                    href={buildInstagramCaptureBookmarkletHref(
                      typeof window !== "undefined" ? window.location.origin : "",
                    )}
                    onClick={(event) => event.preventDefault()}
                  >
                    NB Instagram sayıları
                  </a>
                </li>
                <li>
                  <button
                    type="button"
                    className="admin-btn-secondary"
                    disabled={!profile.instagramUrl.trim()}
                    onClick={() =>
                      openInstagramProfileForCapture(profile.instagramUrl)
                    }
                  >
                    Firma profilini Instagram&apos;da aç
                  </button>
                  {" "}
                  (aynı tarayıcıda Instagram&apos;a girişli olun)
                </li>
                <li>
                  Instagram sekmesine geçin; üstteki{" "}
                  <strong>208 gönderi · 13,9 B takipçi · 1 takip</strong> satırı
                  görünürken yer imine tıklayın — sistem bu metni okur ve forma yazır.
                </li>
                <li>Admin panele dönüp <strong>Kaydet</strong> deyin.</li>
              </ol>
              <p className="admin-social-paste-label">
                Yer imi çalışmazsa: Instagram&apos;da sayıları seçip kopyalayın, buraya
                yapıştırın:
              </p>
              <textarea
                className="admin-input admin-textarea admin-social-paste"
                rows={2}
                placeholder="208 gönderi  13,9 B takipçi  1 takip"
                value={instagramPasteBuffer}
                onChange={(event) => setInstagramPasteBuffer(event.target.value)}
              />
              <button
                type="button"
                className="admin-btn-secondary admin-social-paste-btn"
                onClick={handleParseInstagramPaste}
              >
                Yapıştırılan metinden sayıları çıkar
              </button>
            </div>
            <div className="admin-form-grid">
              <label className="admin-field">
                <span>Facebook</span>
                <input
                  className="admin-input"
                  value={profile.facebookUrl}
                  onChange={(event) =>
                    setProfile((c) => ({ ...c, facebookUrl: event.target.value }))
                  }
                />
              </label>
              <label className="admin-field admin-field--span-2">
                <span>Instagram profil</span>
                <div className="admin-instagram-url-row">
                  <input
                    className="admin-input"
                    value={profile.instagramUrl}
                    onChange={(event) =>
                      setProfile((c) => ({
                        ...c,
                        instagramUrl: event.target.value,
                      }))
                    }
                  />
                  <button
                    type="button"
                    className="admin-btn-secondary"
                    disabled={isRefreshingInstagramStats}
                    onClick={() => void handleRefreshInstagramStats()}
                  >
                    {isRefreshingInstagramStats
                      ? "Alınıyor…"
                      : "İstatistikleri güncelle"}
                  </button>
                </div>
              </label>
              <label className="admin-field">
                <span>Gönderi sayısı</span>
                <input
                  className="admin-input"
                  inputMode="numeric"
                  value={profile.instagramPostsCount}
                  onChange={(event) =>
                    setProfile((c) => ({
                      ...c,
                      instagramPostsCount: event.target.value,
                    }))
                  }
                  placeholder="Örn. 842"
                />
              </label>
              <label className="admin-field">
                <span>Takipçi</span>
                <input
                  className="admin-input"
                  inputMode="numeric"
                  value={profile.instagramFollowersCount}
                  onChange={(event) =>
                    setProfile((c) => ({
                      ...c,
                      instagramFollowersCount: event.target.value,
                    }))
                  }
                  placeholder="Örn. 12500"
                />
              </label>
              <label className="admin-field">
                <span>Takip edilen</span>
                <input
                  className="admin-input"
                  inputMode="numeric"
                  value={profile.instagramFollowingCount}
                  onChange={(event) =>
                    setProfile((c) => ({
                      ...c,
                      instagramFollowingCount: event.target.value,
                    }))
                  }
                  placeholder="Örn. 120"
                />
              </label>
              {profile.instagramStatsFetchedAt || profile.instagramStatsNote ? (
                <p className="admin-org-enrichment-meta admin-field--span-2">
                  {profile.instagramStatsFetchedAt ? (
                    <>
                      Son Instagram güncelleme:{" "}
                      {new Date(profile.instagramStatsFetchedAt).toLocaleString(
                        "tr-TR",
                      )}
                      .{" "}
                    </>
                  ) : null}
                  {profile.instagramStatsNote ? (
                    <span>{profile.instagramStatsNote}</span>
                  ) : null}
                </p>
              ) : null}
              <label className="admin-field">
                <span>X (Twitter)</span>
                <input
                  className="admin-input"
                  value={profile.twitterUrl}
                  onChange={(event) =>
                    setProfile((c) => ({ ...c, twitterUrl: event.target.value }))
                  }
                />
              </label>
              <label className="admin-field">
                <span>YouTube</span>
                <input
                  className="admin-input"
                  value={profile.youtubeUrl}
                  onChange={(event) =>
                    setProfile((c) => ({ ...c, youtubeUrl: event.target.value }))
                  }
                />
              </label>
              <label className="admin-field admin-field--span-2">
                <span>LinkedIn</span>
                <input
                  className="admin-input"
                  value={profile.linkedinUrl}
                  onChange={(event) =>
                    setProfile((c) => ({ ...c, linkedinUrl: event.target.value }))
                  }
                />
              </label>
            </div>
          </form>
        ) : null}

        {activeAction === "edit" && editSection === "audit" ? (
          <section className="admin-panel-card">
            <header className="admin-panel-card-head">
              <div>
                <h2>Denetim günlüğü</h2>
                <p>Yerel operatör kayıtları</p>
              </div>
            </header>
            <ul className="admin-audit-list admin-audit-list--premium">
              {auditLog.length === 0 ? (
                <li className="admin-audit-empty">Henüz kayıt yok.</li>
              ) : (
                auditLog.map((entry) => (
                  <li key={entry.id}>
                    <time dateTime={entry.at}>
                      {new Date(entry.at).toLocaleString("tr-TR")}
                    </time>
                    <span>{entry.summary}</span>
                    <span className="admin-audit-actor">{entry.actorEmail}</span>
                  </li>
                ))
              )}
            </ul>
          </section>
        ) : null}

        {activeAction === "delete" ? (
          <section className="admin-org-delete-panel admin-org-inner-panel">
            <header className="admin-panel-card-head">
              <div>
                <h2>Firmayı sil / temizle</h2>
                <p>
                  API veritabanındaki firma kaydı silinmez; yalnızca yerel operatör ayarları
                  kaldırılır.
                </p>
              </div>
            </header>
            <p className="admin-org-delete-warning">
              <strong>{selectedCompany?.legalName}</strong> için yerel veriler temizlenecek.
            </p>
            <label className="admin-field">
              <span>Onay — kutuya SIL yazın</span>
              <input
                className="admin-input"
                value={deleteConfirm}
                onChange={(event) => setDeleteConfirm(event.target.value)}
                placeholder="SIL"
                autoComplete="off"
              />
            </label>
            <button
              type="button"
              className="admin-btn-primary admin-org-delete-submit"
              onClick={handleClearLocalData}
            >
              Yerel veriyi temizle
            </button>
          </section>
        ) : null}
      </div>
    );
  }

  const q = filter.trim().toLowerCase();
  const filtered = companies.filter((item) => {
    if (typeFilter !== "all" && participantKey(item.participantTypeCode) !== typeFilter) {
      return false;
    }
    if (!q) {
      return true;
    }
    return (
      item.id.toLowerCase().includes(q) ||
      item.legalName.toLowerCase().includes(q) ||
      (item.participantTypeCode ?? "").toLowerCase().includes(q)
    );
  });

  const typeFilters: { id: TypeFilter; label: string }[] = [
    { id: "all", label: "Tümü" },
    { id: "LOAD_SHIPPER", label: "Yük veren" },
    { id: "LOAD_CARRIER", label: "Taşıyan" },
    { id: "LOAD_SEEKER", label: "Arayan" },
    { id: "other", label: "Diğer" },
  ];

  return (
    <div className="platform-admin-command admin-org-premium">
      <header className="platform-admin-command-hero">
        <div>
          <p className="platform-admin-command-eyebrow">Firmalar ve hesaplar</p>
          <h1 className="platform-admin-command-title">Organizasyonlar</h1>
          <p className="platform-admin-command-sub">
            Doğrulama, koridor, dondurma ve profil — üye organizasyon sayfası ile senkron
          </p>
        </div>
        <div className="platform-admin-command-hero-meta">
          <span className="admin-status-pill admin-status-pill--ok">
            {companies.length} kayıtlı firma
          </span>
          <button
            type="button"
            className="admin-btn-ghost-light"
            onClick={() => void refreshDirectory()}
          >
            Yenile
          </button>
        </div>
      </header>

      <section className="admin-kpi-row admin-org-kpi-row" aria-label="Organizasyon özet">
        <article className="admin-kpi-card admin-kpi-card--primary">
          <span className="admin-kpi-label">Toplam organizasyon</span>
          <p className="admin-kpi-value">{companies.length}</p>
          <span className="admin-kpi-hint">API + manuel kayıt</span>
        </article>
        <article className="admin-kpi-card">
          <span className="admin-kpi-label">Doğrulanmış</span>
          <p className="admin-kpi-value">{summary.verified}</p>
        </article>
        <article className="admin-kpi-card">
          <span className="admin-kpi-label">Belge bekliyor</span>
          <p className="admin-kpi-value">{summary.pendingDocs}</p>
        </article>
        <article className="admin-kpi-card">
          <span className="admin-kpi-label">Dondurulmuş</span>
          <p className="admin-kpi-value">{summary.frozen}</p>
        </article>
        <article className="admin-panel-card admin-org-donut-card">
          {donutSegments.length > 0 ? (
            <AdminDonutChart
              segments={donutSegments}
              centerLabel="Rol"
              centerValue={String(companies.length)}
            />
          ) : (
            <p className="platform-admin-empty">Dağılım yok</p>
          )}
        </article>
      </section>

      <div className="admin-org-layout admin-org-layout--premium admin-org-layout--directory">
        <aside className="admin-org-sidebar admin-org-sidebar--full admin-panel-card">
          <header className="admin-org-sidebar-head">
            <h2>Firma dizini</h2>
            <p>{filtered.length} / {companies.length}</p>
          </header>
          <p className="admin-org-swipe-guide">
            Kartı <strong>sola kaydırın</strong> — Düzenle, Kısıtla veya Sil
          </p>
          <label className="admin-field">
            <span>Ara</span>
            <input
              className="admin-input"
              value={filter}
              onChange={(event) => setFilter(event.target.value)}
              placeholder="Unvan, rol veya ID"
            />
          </label>
          <div className="admin-org-type-filters" role="tablist" aria-label="Rol filtresi">
            {typeFilters.map((item) => (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={typeFilter === item.id}
                className={
                  typeFilter === item.id
                    ? "admin-org-type-chip active"
                    : "admin-org-type-chip"
                }
                onClick={() => setTypeFilter(item.id)}
              >
                {item.label}
              </button>
            ))}
          </div>
          <div className="admin-org-add">
            <input
              className="admin-input"
              value={manualId}
              onChange={(event) => setManualId(event.target.value)}
              placeholder="UUID ekle"
            />
            <button type="button" className="admin-btn-secondary" onClick={addCompany}>
              Ekle
            </button>
          </div>
          {loading ? (
            <p className="platform-admin-loading-inline">Liste yükleniyor…</p>
          ) : (
            <ul className="admin-org-company-list admin-org-company-list--premium admin-org-company-list--swipe">
              {filtered.map((item) => {
                const settings = loadOrganizationAdminSettings(item.id);
                return (
                  <li key={item.id} className="admin-org-swipe-li">
                    <OrganizationSwipeListItem
                      item={item}
                      logoUrl={loadOrganizationLogoUrl(item.id)}
                      frozen={settings.accountFrozen}
                      isSelected={selectedId === item.id}
                      isSwipeOpen={swipeOpenId === item.id}
                      onSelect={() => selectCompany(item.id)}
                      onSwipeOpen={() => setSwipeOpenId(item.id)}
                      onSwipeClose={() => setSwipeOpenId(null)}
                      onAction={(action) => pickAction(item.id, action)}
                    />
                    {selectedId === item.id && activeAction ? (
                      <div className="admin-org-inline-expand" ref={actionPanelRef}>
                        {message ? <p className="admin-org-toast">{message}</p> : null}
                        {renderOrgActionPanels()}
                      </div>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
        </aside>

      </div>
    </div>
  );
}
