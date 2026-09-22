import { AdminModulePlaceholder } from "../../../../components/platform-admin/AdminModulePlaceholder";

export default function AdminIntegrationsPage() {
  return (
    <AdminModulePlaceholder
      title="Entegrasyonlar"
      lead="API anahtarları ve harici bağlantılar."
      bullets={[
        "Global rate limit",
        "Webhook hata kuyruğu",
        "Partner API izinleri",
      ]}
    />
  );
}
