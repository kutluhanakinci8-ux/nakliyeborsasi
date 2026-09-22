import { AdminModulePlaceholder } from "../../../../components/platform-admin/AdminModulePlaceholder";

export default function AdminSystemPage() {
  return (
    <AdminModulePlaceholder
      title="Platform ayarları"
      lead="Koridor, dil, bakım ve duyurular."
      bullets={[
        "Bakım modu (read-only site)",
        "Varsayılan dil ve para birimi",
        "Koridor aç/kapa (TR, UA, EU)",
      ]}
    />
  );
}
