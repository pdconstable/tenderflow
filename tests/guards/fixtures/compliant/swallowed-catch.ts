// FIXTURE — compliant with the swallowed-catch guard.
// Excluded from tsc and eslint.

export async function doThingSafely() {
  await Promise.resolve().catch((err) => {
    console.error("promise failed", err);
    throw err;
  });

  try {
    JSON.parse("{}");
  } catch (err) {
    console.warn("optional metadata missing", err);
  }

  try {
    optionalCleanup();
  } catch {
    // safe-catch: best-effort cleanup; failure is non-fatal and intentionally ignored.
  }
}

function optionalCleanup() {
  // no-op
}
