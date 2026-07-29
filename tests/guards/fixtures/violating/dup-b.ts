// FIXTURE — duplicate exported function name (b). Excluded from tsc and eslint.
export function normaliseCompanyName(value: string): string {
  return value.toLowerCase();
}
