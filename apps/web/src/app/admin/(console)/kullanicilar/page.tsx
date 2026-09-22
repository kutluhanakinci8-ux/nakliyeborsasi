import { AdminModulePlaceholder } from "../../../../components/platform-admin/AdminModulePlaceholder";

export default function AdminUsersPage() {
  return (
    <AdminModulePlaceholder
      title="Kullanıcılar"
      lead="Tüm üye hesapları, roller ve davetler."
      bullets={[
        "Kullanıcı arama ve askıya alma",
        "Firma üyelikleri ve rol atama",
        "Şifre sıfırlama ve oturum sonlandırma",
      ]}
    />
  );
}
