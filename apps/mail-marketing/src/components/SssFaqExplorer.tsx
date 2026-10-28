"use client";

import { useMemo, useState } from "react";
import {
  FAQ_CATEGORY_LABELS,
  FAQ_TAB_ORDER,
  type FaqCategory,
  type FaqItem,
} from "@/lib/marketingFaq";

type Props = {
  items: FaqItem[];
};

export function SssFaqExplorer({ items }: Props) {
  const [active, setActive] = useState<FaqCategory | "all">("all");
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLocaleLowerCase("tr");
    return items.filter((item) => {
      if (active !== "all" && item.category !== active) return false;
      if (q.length < 2) return true;
      const blob = `${item.q} ${item.a}`.toLocaleLowerCase("tr");
      return blob.includes(q);
    });
  }, [items, active, query]);

  return (
    <div className="sss-explorer">
      <div className="destek-search sss-explorer__search">
        <label className="destek-search__label" htmlFor="sss-search-input">
          SSS içinde ara
        </label>
        <input
          id="sss-search-input"
          className="destek-search__input"
          type="search"
          placeholder="DNS, webmail, fatura, mesaj…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      <div className="sss-explorer__tabs" role="tablist" aria-label="SSS kategorileri">
        <button
          type="button"
          role="tab"
          aria-selected={active === "all"}
          className={`sss-explorer__tab${active === "all" ? " sss-explorer__tab--active" : ""}`}
          onClick={() => setActive("all")}
        >
          Tümü
        </button>
        {FAQ_TAB_ORDER.map((cat) => (
          <button
            key={cat}
            type="button"
            role="tab"
            aria-selected={active === cat}
            className={`sss-explorer__tab${active === cat ? " sss-explorer__tab--active" : ""}`}
            onClick={() => setActive(cat)}
          >
            {FAQ_CATEGORY_LABELS[cat]}
          </button>
        ))}
      </div>

      <p className="sss-explorer__count" aria-live="polite">
        {filtered.length} soru
      </p>

      <div className="faq-list">
        {filtered.length === 0 ? (
          <p className="sss-explorer__empty">
            Eşleşen soru yok.{" "}
            <a href="/rehberler">Kurulum rehberlerine</a> bakın veya{" "}
            <a href="/iletisim">iletişim formu</a>.
          </p>
        ) : (
          filtered.map((item) => (
            <details key={item.q} className="faq-item" data-category={item.category}>
              <summary>
                <span className="sss-explorer__faq-cat">{FAQ_CATEGORY_LABELS[item.category]}</span>
                {item.q}
              </summary>
              <p>{item.a}</p>
            </details>
          ))
        )}
      </div>
    </div>
  );
}
