"use client";

import { useState } from "react";
import { MarketplaceApiClient } from "../lib/MarketplaceApiClient";

export default function HomePage() {
  const [accessToken, setAccessToken] = useState("");
  const [locale, setLocale] = useState("tr");
  const [responsePayload, setResponsePayload] = useState<string>("");

  async function handleLoadListings(): Promise<void> {
    const payload = await MarketplaceApiClient.fetchListings(accessToken, locale);
    setResponsePayload(JSON.stringify(payload, null, 2));
  }

  return (
    <main style={{ padding: 24, fontFamily: "sans-serif" }}>
      <h1>Nakliye Borsası Web</h1>
      <p>API tabanlı panel iskeleti (Next.js)</p>
      <label>
        Locale
        <select value={locale} onChange={(event) => setLocale(event.target.value)}>
          <option value="tr">tr</option>
          <option value="en">en</option>
          <option value="uk">uk</option>
          <option value="ru">ru</option>
        </select>
      </label>
      <br />
      <label>
        Access Token
        <input
          style={{ width: 420 }}
          value={accessToken}
          onChange={(event) => setAccessToken(event.target.value)}
        />
      </label>
      <br />
      <button type="button" onClick={() => void handleLoadListings()}>
        Load marketplace listings
      </button>
      <pre>{responsePayload}</pre>
    </main>
  );
}
