import { AdminModulePlaceholder } from "../../../../components/platform-admin/AdminModulePlaceholder";

export default function AdminSubscriptionsPage() {
  return (
    <AdminModulePlaceholder
      title="Abonelikler"
      lead="Plan kataloğu ve firma paket atamaları."
      bullets={[
        "Plan oluşturma (carrier_professional_tr_ua vb.)",
        "Firma abonelik yükseltme / düşürme",
        "Modül erişim matrisi",
      ]}
    />
  );
}
