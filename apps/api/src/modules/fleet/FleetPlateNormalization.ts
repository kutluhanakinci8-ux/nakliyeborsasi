export function normalizeLicensePlate(plate: string): string {
  return plate.replace(/[\s-]/g, "").toUpperCase();
}
