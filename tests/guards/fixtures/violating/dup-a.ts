// FIXTURE — duplicate exported function name (a). Excluded from tsc and eslint.
export function normaliseCompanyName(value: string): string {
  return value.trim();
}
