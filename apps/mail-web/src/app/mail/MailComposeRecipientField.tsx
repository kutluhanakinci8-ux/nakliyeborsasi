"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { MailOrgContact } from "@/lib/mailApi";

type Props = {
  id: string;
  label: string;
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  contacts: MailOrgContact[];
  autoFocus?: boolean;
};

function activeRecipientQuery(value: string): {
  prefix: string;
  query: string;
} {
  const lastComma = value.lastIndexOf(",");
  if (lastComma === -1) {
    return { prefix: "", query: value.trim() };
  }
  const tail = value.slice(lastComma + 1);
  return {
    prefix: value.slice(0, lastComma + 1),
    query: tail.trim(),
  };
}

export function MailComposeRecipientField({
  id,
  label,
  placeholder,
  value,
  onChange,
  contacts,
  autoFocus,
}: Props) {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);

  const { prefix, query } = useMemo(
    () => activeRecipientQuery(value),
    [value],
  );

  const suggestions = useMemo(() => {
    if (!query) {
      return contacts
        .filter((c) => c.email)
        .slice(0, 8);
    }
    const q = query.toLowerCase();
    return contacts
      .filter((c) => {
        if (!c.email) {
          return false;
        }
        const email = c.email.toLowerCase();
        const name = c.displayName.toLowerCase();
        return email.includes(q) || name.includes(q) || name.startsWith(q);
      })
      .slice(0, 8);
  }, [contacts, query]);

  const showList = open && suggestions.length > 0;

  useEffect(() => {
    setHighlight(0);
  }, [query, suggestions.length]);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  function pick(contact: MailOrgContact) {
    const email = contact.email?.trim();
    if (!email) {
      return;
    }
    const next = prefix ? `${prefix} ${email}` : email;
    onChange(next);
    setOpen(false);
  }

  return (
    <div className="compose-field compose-recipient-field" ref={rootRef}>
      <label className="compose-field-label" htmlFor={id}>
        {label}
      </label>
      <input
        id={id}
        className="compose-input"
        placeholder={placeholder}
        value={value}
        autoFocus={autoFocus}
        autoComplete="off"
        role="combobox"
        aria-expanded={showList}
        aria-controls={showList ? listId : undefined}
        aria-autocomplete="list"
        onFocus={() => setOpen(true)}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onKeyDown={(e) => {
          if (!showList) {
            if (e.key === "ArrowDown" && suggestions.length > 0) {
              setOpen(true);
              e.preventDefault();
            }
            return;
          }
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setHighlight((i) => (i + 1) % suggestions.length);
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setHighlight(
              (i) => (i - 1 + suggestions.length) % suggestions.length,
            );
          } else if (e.key === "Enter") {
            e.preventDefault();
            pick(suggestions[highlight]);
          } else if (e.key === "Escape") {
            setOpen(false);
          }
        }}
      />
      {showList ? (
        <ul
          id={listId}
          className="compose-contact-suggest"
          role="listbox"
          aria-label="Kayıtlı kişiler"
        >
          {suggestions.map((c, index) => (
            <li key={c.id} role="option" aria-selected={index === highlight}>
              <button
                type="button"
                className={
                  index === highlight ? "is-active" : undefined
                }
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pick(c)}
              >
                <span className="compose-contact-suggest-name">
                  {c.displayName}
                </span>
                <span className="compose-contact-suggest-email">
                  {c.email}
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      {open && contacts.length === 0 && query.length > 0 ? (
        <p className="compose-contact-suggest-empty">
          Kayıtlı kişi bulunamadı. Kişiler sekmesinden ekleyin.
        </p>
      ) : null}
    </div>
  );
}
