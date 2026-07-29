// FIXTURE — compliant with the raw-status-update guard (no status mutation).
// Excluded from tsc and eslint.

export function readBid(db: { from: (t: string) => { select: (c: string) => unknown } }) {
  return db.from("bids").select("id, title");
}
