"use client";

import { useEffect, useState } from "react";

type AuctionCounterOfferDialogProps = {
  open: boolean;
  listingLabel: string;
  defaultAmount: number | null;
  defaultCurrency: string;
  isSubmitting: boolean;
  errorMessage?: string;
  onClose: () => void;
  onSubmit: (payload: { amount: number; currencyCode: string; note: string }) => void;
};

export function AuctionCounterOfferDialog({
  open,
  listingLabel,
  defaultAmount,
  defaultCurrency,
  isSubmitting,
  errorMessage,
  onClose,
  onSubmit,
}: AuctionCounterOfferDialogProps) {
  const [amount, setAmount] = useState("");
  const [currencyCode, setCurrencyCode] = useState(defaultCurrency);
  const [note, setNote] = useState("");

  useEffect(() => {
    if (open) {
      setAmount(defaultAmount != null ? String(defaultAmount) : "");
      setCurrencyCode(defaultCurrency);
      setNote("");
    }
  }, [open, defaultAmount, defaultCurrency]);

  if (!open) {
    return null;
  }

  return (
    <div className="auction-modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="auction-modal"
        role="dialog"
        aria-labelledby="counter-offer-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="auction-modal-header">
          <h2 id="counter-offer-title" className="auction-modal-title">
            Fiyat öner (mesaj)
          </h2>
          <p className="auction-modal-subtitle">{listingLabel}</p>
        </header>
        <div className="auction-modal-body">
          <p className="auction-modal-hint">
            TIMOCOM / Trans.eu tarzı: öneriniz karşı firmaya Messenger üzerinden
            gider; ihaleye alternatif kanal.
          </p>
          <label className="auction-modal-label" htmlFor="offer-amount">
            Önerilen tutar
          </label>
          <div className="auction-modal-amount-row">
            <input
              id="offer-amount"
              className="auction-modal-input"
              inputMode="decimal"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
            />
            <input
              className="auction-modal-input auction-modal-input--currency"
              value={currencyCode}
              onChange={(event) => setCurrencyCode(event.target.value)}
              maxLength={8}
            />
          </div>
          <label className="auction-modal-label" htmlFor="offer-note">
            Not (isteğe bağlı)
          </label>
          <textarea
            id="offer-note"
            className="auction-modal-textarea"
            rows={3}
            value={note}
            onChange={(event) => setNote(event.target.value)}
          />
          {errorMessage ? (
            <p className="error banner error--light">{errorMessage}</p>
          ) : null}
        </div>
        <footer className="auction-modal-footer">
          <button
            type="button"
            className="btn-secondary btn-secondary--light"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Vazgeç
          </button>
          <button
            type="button"
            className="btn-accent"
            disabled={isSubmitting}
            onClick={() => {
              const parsed = Number.parseFloat(amount.replace(",", "."));
              if (!Number.isFinite(parsed) || parsed <= 0) {
                return;
              }
              onSubmit({
                amount: parsed,
                currencyCode: currencyCode.trim() || defaultCurrency,
                note,
              });
            }}
          >
            {isSubmitting ? "Gönderiliyor…" : "Mesajla gönder"}
          </button>
        </footer>
      </div>
    </div>
  );
}
