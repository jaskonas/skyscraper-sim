export function formatMoney(usd: number): string {
  if (Math.abs(usd) >= 1e9) return `$${(usd / 1e9).toFixed(2)}B`;
  return `$${Math.round(usd / 1e6)}M`;
}
