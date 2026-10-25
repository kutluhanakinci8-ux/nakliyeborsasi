import { AuctionDetailPageClient } from "../AuctionDetailPageClient";

type PageProps = {
  params: Promise<{ sessionId: string }>;
};

export default async function AuctionDetailPage({ params }: PageProps) {
  const { sessionId } = await params;
  return <AuctionDetailPageClient sessionId={sessionId} />;
}
