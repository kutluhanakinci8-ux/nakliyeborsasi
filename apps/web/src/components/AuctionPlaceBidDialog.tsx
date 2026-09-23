"use client";

import { useEffect, useMemo, useState } from "react";
import {
  formatPaymentDeferTr,
  formatPaymentFormTr,
  formatVatInclusionTr,
} from "../lib/paymentFormDisplay";
import { suggestNextReverseBid, parseBidAmount } from "../lib/auctionBidMath";
import type { AuctionSessionTermsFields } from "../lib/AuctionApiClient";
import type { AuctionCompetitionSnapshot } from "../lib/AuctionApiClient";

export type AuctionPlaceBidContext = {
  sessionId: string;
  title: string;
  referenceCeiling: string;
  currencyCode: string;
  endsAt: string;
  auctionTypeCode: string;
  competition: AuctionCompetitionSnapshot;
  terms?: AuctionSessionTermsFields | null;
};

type AuctionPlaceBidDialogProps = {
  open: boolean;
  context: AuctionPlaceBidContext | null;
  isSubmitting: boolean;
  errorMessage?: string;
  onClose: () => void;
  onSubmit: (amount: number) => void;
};

export function AuctionPlaceBidDialog({
  open,
  context,
  isSubmitting,
  errorMessage,
  onClose,
  onSubmit,
}: AuctionPlaceBidDialogProps) {
  const [amountInput, setAmountInput] = useState("");

  const suggested = useMemo(() => {
    if (!context) {
      return "";
    }
    if (context.auctionTypeCode === "FIXED_ACCEPT") {
      return context.referenceCeiling;
    }
    return String(
      suggestNextReverseBid({
        referenceCeiling: context.referenceCeiling,
        bidStepAmount: context.terms?.bidStepAmount ?? null,
        bestBidAmount: context.competition.bestBidAmount,
      }),
    );
  }, [context]);

  useEffect(() => {
    if (open && context) {
      setAmountInput(suggested);
    }
  }, [open, context, suggested]);

  if (!open || !context) {
    return null;
  }

  const step = context.terms?.bidStepAmount
    ? parseBidAmount(context.terms.bidStepAmount)
    : 50;
  const best = context.competition.bestBidAmount;
  const maxAllowed =
    best !== null
      ? Math.max(parseBidAmount(best) - step, 0.01)
      : parseBidAmount(context.referenceCeiling);

  function adjustBy(deltaSteps: number): void {
    const current = parseBidAmount(amountInput || suggested);
    const next = Math.round((current - deltaSteps * step) * 100) / 100;
    setAmountInput(String(Math.max(next, 0.01)));
  }

  function handleSubmit(): void {
    const amount = parseBidAmount(amountInput);
    if (!Number.isFinite(amount) || amount <= 0) {
      return;
    }
    onSubmit(amount);
  }

  return (
    <div className="auction-modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="auction-modal"
        role="dialog"
        aria-labelledby="auction-bid-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="auction-modal-header">
          <h2 id="auction-bid-title" className="auction-modal-title">
            Teklif ver
          </h2>
          <p className="auction-modal-subtitle">{context.title}</p>
        </header>

        <div className="auction-modal-body">
          <dl className="auction-detail-spec-grid auction-detail-payment-grid">
            <div>
              <dt>En iyi teklif</dt>
              <dd>
                {best
                  ? `${Number(best).toLocaleString("tr-TR")} ${context.currencyCode}`
                  : "Henüz yok"}
              </dd>
            </div>
            <div>
              <dt>Sizin sıranız</dt>
              <dd>
                {context.competition.myRank
                  ? `L${context.competition.myRank}`
                  : "—"}
              </dd>
            </div>
            <div>
              <dt>Tavan / referans</dt>
              <dd>
                {Number(context.referenceCeiling).toLocaleString("tr-TR")}{" "}
                {context.currencyCode}
              </dd>
            </div>
            <div>
              <dt>Bitiş</dt>
              <dd>{new Date(context.endsAt).toLocaleString()}</dd>
            </div>
          </dl>

          {context.terms ? (
            <p className="auction-modal-terms-hint">
              {formatPaymentFormTr(context.terms.paymentFormCode)} ·{" "}
              {formatPaymentDeferTr(
                context.terms.paymentFormCode,
                context.terms.paymentDeferDays,
              )}{" "}
              · {formatVatInclusionTr(context.terms.priceIncludesVat)}
              {context.terms.bidStepAmount
                ? ` · Min. adım ${context.terms.bidStepAmount} ${context.currencyCode}`
                : ""}
            </p>
          ) : null}

          <label className="auction-modal-label" htmlFor="auction-bid-amount">
            Teklif tutarı ({context.currencyCode})
          </label>
          <div className="auction-modal-amount-row">
            <button
              type="button"
              className="btn-secondary btn-secondary--light"
              onClick={() => adjustBy(1)}
              disabled={isSubmitting}
            >
              −{step}
            </button>
            <input
              id="auction-bid-amount"
              className="auction-modal-input"
              inputMode="decimal"
              value={amountInput}
              onChange={(event) => setAmountInput(event.target.value)}
              disabled={isSubmitting}
            />
            <button
              type="button"
              className="btn-secondary btn-secondary--light"
              onClick={() => adjustBy(-1)}
              disabled={isSubmitting}
            >
              +{step}
            </button>
          </div>
          <p className="auction-modal-hint">
            Ters ihale: geçerli üst sınır yaklaşık{" "}
            <strong>
              {maxAllowed.toLocaleString("tr-TR")} {context.currencyCode}
            </strong>
            . Göndermeden önce şartnameyi detay sayfasında okuyun.
          </p>

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
            onClick={() => handleSubmit()}
            disabled={isSubmitting}
          >
            {isSubmitting ? "Gönderiliyor…" : "Teklifi onayla"}
          </button>
        </footer>
      </div>
    </div>
  );
}
