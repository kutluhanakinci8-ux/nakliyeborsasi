export function formatPaymentFormTr(code: string | null | undefined): string {
  if (!code) {
    return "Belirtilmemiş";
  }
  const map: Record<string, string> = {
    BANK_TRANSFER: "Banka havalesi",
    CASH: "Nakit",
    CARD: "Kart / POS",
    DEFERRED: "Vadeli ödeme",
  };
  return map[code] ?? code;
}

export function formatVatInclusionTr(priceIncludesVat: boolean): string {
  return priceIncludesVat ? "KDV dahil" : "KDV hariç";
}

export function formatPaymentDeferTr(
  paymentFormCode: string | null | undefined,
  paymentDeferDays: number | null | undefined,
): string {
  if (paymentFormCode === "DEFERRED" && paymentDeferDays != null) {
    return `${paymentDeferDays} gün vade`;
  }
  if (paymentDeferDays != null && paymentDeferDays > 0) {
    return `Ödeme süresi: ${paymentDeferDays} gün`;
  }
  return "Peşin / anlaşmaya göre";
}
