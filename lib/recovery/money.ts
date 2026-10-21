import { SECONDS_PER_DAY } from "./time";

/** Money not spent, from a daily cost and elapsed sober seconds. Whole currency units, rounded down. */
export function moneySaved(dailyCost: number | null | undefined, soberSeconds: number): number {
  if (!dailyCost || dailyCost <= 0 || soberSeconds <= 0) return 0;
  return Math.floor((Number(dailyCost) * soberSeconds) / SECONDS_PER_DAY);
}

export function formatMoney(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 0 }).format(amount);
  } catch {
    return `${amount.toLocaleString("en-US")} ${currency}`;
  }
}
