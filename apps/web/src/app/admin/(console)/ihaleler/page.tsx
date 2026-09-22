import { AdminModulePlaceholder } from "../../../../components/platform-admin/AdminModulePlaceholder";

export default function AdminAuctionsPage() {
  return (
    <AdminModulePlaceholder
      title="İhaleler"
      lead="Açık ihaleler, kurallar ve müdahale."
      bullets={["İhale iptali", "Minimum teklif düzeltme", "İhale geçmişi raporu"]}
    />
  );
}
