import { PlatformAdminConsoleGuard } from "../../../components/platform-admin/PlatformAdminConsoleGuard";

export default function AdminConsoleLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <PlatformAdminConsoleGuard>{children}</PlatformAdminConsoleGuard>;
}
