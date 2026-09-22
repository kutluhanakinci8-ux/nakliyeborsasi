"use client";

import { CountryFlag } from "./CountryFlag";
import { normalizeCountryCode } from "../lib/countryDisplay";

type FreightRouteHeadingProps = {
  originCity: string;
  originCountry: string;
  destinationCity: string;
  destinationCountry: string;
  className?: string;
};

function RouteEndpoint({
  city,
  countryCode,
}: {
  city: string;
  countryCode: string;
}) {
  const code = normalizeCountryCode(countryCode) ?? countryCode.trim().toUpperCase();

  return (
    <span className="freight-route-endpoint">
      <CountryFlag code={countryCode} size="sm" className="freight-route-flag" />
      <span className="freight-route-place">
        {city}
        <span className="freight-route-code"> ({code})</span>
      </span>
    </span>
  );
}

export function FreightRouteHeading({
  originCity,
  originCountry,
  destinationCity,
  destinationCountry,
  className = "freight-route",
}: FreightRouteHeadingProps) {
  return (
    <h3 className={className}>
      <RouteEndpoint city={originCity} countryCode={originCountry} />
      <span className="freight-route-sep" aria-hidden> — </span>
      <RouteEndpoint city={destinationCity} countryCode={destinationCountry} />
    </h3>
  );
}

export function FreightRouteCountryBadges({
  originCountry,
  destinationCountry,
}: {
  originCountry: string;
  destinationCountry: string;
}) {
  const originCode = normalizeCountryCode(originCountry) ?? originCountry;
  const destinationCode =
    normalizeCountryCode(destinationCountry) ?? destinationCountry;

  return (
    <>
      <span
        className="badge badge--country freight-route-country-badge"
        title="Çıkış ülkesi"
      >
        <CountryFlag code={originCountry} size="sm" />
        <span>{originCode}</span>
      </span>
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
