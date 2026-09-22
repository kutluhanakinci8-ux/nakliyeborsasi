import { AccountLayoutClient } from "../../../components/AccountLayoutClient";

export default function HesapLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AccountLayoutClient>{children}</AccountLayoutClient>;
}
