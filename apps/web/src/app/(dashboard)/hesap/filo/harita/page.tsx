import dynamic from "next/dynamic";

const FleetLiveMapPageClient = dynamic(
  () =>
    import("./FleetLiveMapPageClient").then((mod) => mod.FleetLiveMapPageClient),
  { ssr: false },
);

export default function FleetLiveMapPage() {
  return <FleetLiveMapPageClient />;
}
