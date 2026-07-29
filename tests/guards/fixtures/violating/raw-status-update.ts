// FIXTURE — deliberately violates the raw-status-update guard.
// Represents a prohibited raw status write outside a state-machine module.
// Excluded from tsc and eslint.

export function submitBid(db: { from: (t: string) => { update: (v: unknown) => unknown } }) {
  db.from("bids").update({ status: "submitted" });

  let status = "";
  status = "active";
  return status;
}
