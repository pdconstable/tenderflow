// FIXTURE — deliberately violates the swallowed-catch guard.
// Excluded from tsc and eslint. Never imported by application code.

export async function doThing() {
  await Promise.resolve().catch(() => {});

  try {
    JSON.parse("{}");
  } catch (err) {
  }
}
