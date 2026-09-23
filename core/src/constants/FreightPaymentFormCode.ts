/** Taşıma ödeme şekli (uluslararası borsa sözlüğü). */
export const FreightPaymentFormCode = {
  BankTransfer: "BANK_TRANSFER",
  Cash: "CASH",
  Card: "CARD",
  Deferred: "DEFERRED",
} as const;

export type FreightPaymentFormCode =
  (typeof FreightPaymentFormCode)[keyof typeof FreightPaymentFormCode];
