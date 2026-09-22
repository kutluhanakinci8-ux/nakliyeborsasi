import { AdminModulePlaceholder } from "../../../../components/platform-admin/AdminModulePlaceholder";

export default function AdminListingsPage() {
  return (
    <AdminModulePlaceholder
      title="Yük ilanları"
      lead="Marketplace ilan moderasyonu ve yayın durumu."
      bullets={[
        "İlan onay / red / düzenleme",
        "Sahip firma ve koridor filtresi",
        "Öne çıkarma ve süre uzatma",
      ]}
    />
  );
}
