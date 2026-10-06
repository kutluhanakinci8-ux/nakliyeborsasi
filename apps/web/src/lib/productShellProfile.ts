export type ProductShellCode = "lerta" | "ekolojik";

export function resolveProductShell(): ProductShellCode {
  const raw = process.env.NEXT_PUBLIC_PRODUCT_SHELL?.trim().toLowerCase();
  if (raw === "ekolojik" || raw === "ekolojikmarket") {
    return "ekolojik";
  }
  return "lerta";
}

export function isEkolojikProductShell(): boolean {
  return resolveProductShell() === "ekolojik";
}
