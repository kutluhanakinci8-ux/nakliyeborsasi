import { AdminModulePlaceholder } from "../../../../components/platform-admin/AdminModulePlaceholder";

export default function AdminTrustPage() {
  return (
    <AdminModulePlaceholder
      title="Güven skorları"
      lead="Değerlendirmeler ve itibar moderasyonu."
      bullets={[
        "Şüpheli yorum inceleme",
        "Skor düzeltme ve rozet",
        "Kara liste firmalar",
      ]}
    />
  );
}
