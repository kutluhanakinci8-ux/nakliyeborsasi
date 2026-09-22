import Link from "next/link";
import { flattenPlatformAdminNav } from "../../../lib/platformAdminNavigation";

export default function PlatformAdminHomePage() {
  const modules = flattenPlatformAdminNav().filter((item) => item.href !== "/admin");

  return (
    <div className="platform-admin-dashboard">
      <header className="platform-admin-panel-head">
        <h1 className="platform-admin-page-title">Kontrol merkezi</h1>
        <p className="platform-admin-page-lead">
          Tüm platform modülleri bu konsoldan yönetilir. Üye arayüzünden bağımsız
          çalışır; marketplace menüsü burada görünmez.
        </p>
      </header>
      <div className="platform-admin-stat-grid">
        <div className="platform-admin-stat">
          <span className="platform-admin-stat-value">TR · UA · EU</span>
          <span className="platform-admin-stat-label">Aktif koridor</span>
        </div>
        <div className="platform-admin-stat">
          <span className="platform-admin-stat-value">Organizasyon</span>
          <span className="platform-admin-stat-label">Tam yönetim hazır</span>
        </div>
        <div className="platform-admin-stat">
          <span className="platform-admin-stat-value">API</span>
          <span className="platform-admin-stat-label">:3010 bağlı</span>
        </div>
      </div>
      <div className="platform-admin-module-grid">
        {modules.map((module) => (
          <Link key={module.href} href={module.href} className="platform-admin-module-card">
            <h2>{module.label}</h2>
            <p>{module.description}</p>
            <span className="platform-admin-module-cta">Modüle git →</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
