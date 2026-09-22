import { AdminModulePlaceholder } from "../../../../components/platform-admin/AdminModulePlaceholder";

export default function AdminPaymentsPage() {
  return (
    <AdminModulePlaceholder
      title="Ödemeler ve faturalar"
      lead="Platform geliri ve firma tahsilatları."
      bullets={[
        "Fatura listesi ve PDF",
        "Ödeme yöntemi inceleme",
        "Gecikmiş tahsilat uyarıları",
      ]}
    />
  );
}
