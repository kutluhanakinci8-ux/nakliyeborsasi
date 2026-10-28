"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { searchSupportIndex } from "@/lib/marketingSupportSearch";

export function DestekHubSearch() {
  const [query, setQuery] = useState("");

  const hits = useMemo(() => searchSupportIndex(query), [query]);

  const popular = [
    { label: "DNS kayıtlarını kim ekler?", href: "/sss" },
    { label: "Webmail nerede?", href: "/sss" },
    { label: "Hizmet durumu", href: "/durum" },
  ];

  return (
    <div className="destek-search">
      <label className="destek-search__label" htmlFor="destek-search-input">
        Yardım ara
      </label>
      <div className="destek-search__field-wrap">
        <input
          id="destek-search-input"
          className="destek-search__input"
          type="search"
          name="q"
          placeholder="DNS, webmail, fatura, mesaj girişi…"
          autoComplete="off"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-describedby="destek-search-hint"
        />
      </div>
      <p id="destek-search-hint" className="destek-search__hint">
        SSS ve destek sayfalarında arama. Canlı sohbet yok — önce self-servis, sonra{" "}
        <a href="mailto:destek@lerta.com.tr">destek@lerta.com.tr</a>.
      </p>

      {query.trim().length >= 2 && (
        <ul className="destek-search__results" role="listbox" aria-label="Arama sonuçları">
          {hits.length === 0 ? (
            <li className="destek-search__empty">
              Sonuç yok.{" "}
              <Link href="/iletisim">İletişim formu</Link> veya{" "}
              <a href="mailto:destek@lerta.com.tr">e-posta</a>.
            </li>
          ) : (
            hits.map((hit) => (
              <li key={hit.id}>
                <Link className="destek-search__hit" href={hit.href}>
                  <span className="destek-search__hit-title">{hit.title}</span>
                  <span className="destek-search__hit-excerpt">{hit.excerpt}</span>
                </Link>
              </li>
            ))
          )}
        </ul>
      )}

      {query.trim().length < 2 && (
        <div className="destek-search__popular">
          <span className="destek-search__popular-label">Sık aranan</span>
          <ul>
            {popular.map((p) => (
              <li key={p.label}>
                <Link href={p.href}>{p.label}</Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
