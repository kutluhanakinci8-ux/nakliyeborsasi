import { AuctionDetailPageClient } from "../AuctionDetailPageClient";

type PageProps = {
  params: { sessionId: string };
};

export default function AuctionDetailPage({ params }: PageProps) {
  return <AuctionDetailPageClient sessionId={params.sessionId} />;
}
