"use client";

import { CountryFlag } from "./CountryFlag";
import { normalizeCountryCode } from "../lib/countryDisplay";
import {
  freightLocationPrimaryLabel,
  freightLocationSecondaryLabel,
  freightPlaceKindLabelTr,
  type FreightLocationPoint,
} from "../lib/freightLocationDisplay";

type FreightRouteHeadingProps = {
  origin: FreightLocationPoint;
  destination: FreightLocationPoint;
  className?: string;
};

function RouteEndpointBlock({ point }: { point: FreightLocationPoint }) {
  const primary = freightLocationPrimaryLabel(point);
  const secondary = freightLocationSecondaryLabel(point);
  const kindLabel = freightPlaceKindLabelTr(point.placeKindCode);

  return (
    <span className="freight-route-endpoint-block">
      <span className="freight-route-endpoint-head">
        <CountryFlag code={point.countryCode} size="sm" className="freight-route-flag" />
        <span className="freight-route-primary">{primary}</span>
      </span>
      <span className="freight-route-secondary">
        <span className="freight-route-kind">{kindLabel}</span>
        <span className="freight-route-secondary-sep" aria-hidden> · </span>
        <span>{secondary}</span>
      </span>
    </span>
  );
}

export function FreightRouteHeading({
  origin,
  destination,
  className = "freight-route",
}: FreightRouteHeadingProps) {
  return (
    <div className={className}>
      <RouteEndpointBlock point={origin} />
      <span className="freight-route-sep freight-route-sep--arrow" aria-hidden>
        →
      </span>
      <RouteEndpointBlock point={destination} />
    </div>
  );
}

/** Üst şerit: çıkış / varış ülke kodları (bayraklı). */
export function FreightRouteCountryBadges({
  originCountry,
  destinationCountry,
}: {
  originCountry: string;
  destinationCountry: string;
}) {
  const originCode =
    normalizeCountryCode(originCountry) ?? originCountry.trim().toUpperCase();
  const destinationCode =
    normalizeCountryCode(destinationCountry) ??
    destinationCountry.trim().toUpperCase();

  return (
    <>
      <span
        className="badge badge--country freight-route-country-badge"
        title="Çıkış ülkesi"
      >
        <CountryFlag code={originCountry} size="sm" />
        <span>{originCode}</span>
      </span>
      <span className="freight-route-badge-arrow" aria-hidden>→</span>
      <span
        className="badge badge--country freight-route-country-badge"
        title="Varış ülkesi"
      >
        <CountryFlag code={destinationCountry} size="sm" />
        <span>{destinationCode}</span>
      </span>
    </>
  );
}
