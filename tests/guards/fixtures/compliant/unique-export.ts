// FIXTURE — a single unique export. Excluded from tsc and eslint.
export function formatMoneyMinorUnits(pennies: number): string {
  return (pennies / 100).toFixed(2);
}
