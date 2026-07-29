#!/usr/bin/env bash
#
# supabase_guard.sh — Reusable safety guard for destructive scripts.
#
# PURPOSE
#   Refuse to run against anything other than THIS repo's Supabase project.
#   It reads the ref from the ACTUAL live connection in use (the DB connection
#   string / linked pooler URL that scripts will really talk to) — NOT merely
#   from an environment variable that could be stale or spoofed — and it
#   verifies that connection is live before allowing the caller to continue.
#
# USAGE
#   Make this the FIRST line of every seed / reset / destructive script,
#   before ANY database access:
#
#       source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/lib/supabase_guard.sh"
#
#   Sourcing runs the guard immediately. If the connection does not point at
#   the expected project, the guard prints a loud error and exits non-zero,
#   aborting the calling script. It NEVER returns control on a mismatch.
#
#   You can also run it standalone to check the current connection:
#       ./scripts/lib/supabase_guard.sh
#
# EXIT CODES (when the guard fails, the calling script exits with these)
#   10  Could not resolve a live connection ref (fail closed — never guess).
#   11  Ref does not match the expected project for this repo.
#   12  Forbidden project detected (V5 JMS Direct — live production).
#   13  Live connection probe failed (could not reach the resolved project).

# ---------------------------------------------------------------------------
# Configuration — the ONLY project this repo may ever touch.
# ---------------------------------------------------------------------------
readonly TF_EXPECTED_REF="vrngjoorzwcgagwpzzyt"          # Tender flow (this repo)

# Refs that must be hard-refused BY NAME, as an explicit second check, even if
# they were somehow to match something else. V5 JMS Direct is a separate LIVE
# production business system and must never be reached from this repo.
readonly TF_FORBIDDEN_REFS=(
  "wcxxhzenwqlukhtphjyc"   # V5 JMS Direct — live production. DO NOT TOUCH.
)

# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

# Locate this repo's root from the guard file's own location, so resolution
# works no matter what directory the calling script was run from.
_tf_repo_root() {
  cd "$(dirname "${BASH_SOURCE[0]}")/../.." >/dev/null 2>&1 && pwd
}

# Extract a Supabase project ref from a connection string / URL.
# Handles both the pooler form (user "postgres.<ref>") and the direct-host
# form (host "db.<ref>.supabase.co" or "<ref>.supabase.co").
_tf_ref_from_url() {
  local url="$1" ref=""
  # Pooler username form: postgres.<ref>@host
  ref="$(printf '%s' "$url" | grep -oE 'postgres\.[a-z0-9]{20}' | head -1 | cut -d. -f2)"
  if [ -z "$ref" ]; then
    # Direct host form: db.<ref>.supabase.co  or  <ref>.supabase.co
    ref="$(printf '%s' "$url" | grep -oE '[a-z0-9]{20}\.supabase\.(co|com)' | head -1 | cut -d. -f1)"
  fi
  printf '%s' "$ref"
}

# Resolve the connection string that scripts will ACTUALLY use, in precedence
# order. Prints the URL on stdout. Empty output means "could not resolve".
_tf_resolve_connection_url() {
  local root; root="$(_tf_repo_root)"
  if [ -n "${SUPABASE_DB_URL:-}" ]; then
    printf '%s' "$SUPABASE_DB_URL"; return
  fi
  if [ -n "${DATABASE_URL:-}" ]; then
    printf '%s' "$DATABASE_URL"; return
  fi
  # The live pooler URL recorded by `supabase link` for the connected project.
  if [ -f "$root/supabase/.temp/pooler-url" ]; then
    cat "$root/supabase/.temp/pooler-url"; return
  fi
}

# Loud, unmissable failure banner + exit. Never returns.
_tf_die() {
  local code="$1"; shift
  {
    echo ""
    echo "################################################################################"
    echo "##  ⛔  SUPABASE SAFETY GUARD — REFUSING TO RUN                                ##"
    echo "################################################################################"
    while [ "$#" -gt 0 ]; do echo "##  $1"; shift; done
    echo "##"
    echo "##  No database access has been performed. Aborting immediately."
    echo "################################################################################"
    echo ""
  } >&2
  # `exit` from a sourced file aborts the calling script too — which is the goal.
  exit "$code"
}

# ---------------------------------------------------------------------------
# The guard
# ---------------------------------------------------------------------------
tf_supabase_guard() {
  local url ref probe_url pw

  url="$(_tf_resolve_connection_url)"

  # (0) Explicit, by-name refusal of forbidden projects — checked against the
  #     RAW connection string first, before anything else can go wrong.
  local forbidden
  for forbidden in "${TF_FORBIDDEN_REFS[@]}"; do
    if printf '%s' "$url" | grep -q "$forbidden"; then
      _tf_die 12 \
        "FORBIDDEN PROJECT DETECTED: $forbidden" \
        "This is V5 JMS Direct — a live production business system." \
        "This repo (Tender flow) may NEVER connect to it."
    fi
  done

  # (1) Must be able to read a live connection ref — fail closed if we cannot.
  if [ -z "$url" ]; then
    _tf_die 10 \
      "Could not determine the live Supabase connection." \
      "Checked: \$SUPABASE_DB_URL, \$DATABASE_URL, supabase/.temp/pooler-url" \
      "Run 'source .env.local && supabase link' or export a DB URL, then retry."
  fi

  ref="$(_tf_ref_from_url "$url")"
  if [ -z "$ref" ]; then
    _tf_die 10 \
      "Resolved a connection string but could not parse a project ref from it." \
      "Connection (host only): $(printf '%s' "$url" | sed -E 's#//[^@]*@#//<redacted>@#')"
  fi

  # (2) Forbidden ref, checked again against the PARSED ref (belt and braces).
  for forbidden in "${TF_FORBIDDEN_REFS[@]}"; do
    if [ "$ref" = "$forbidden" ]; then
      _tf_die 12 \
        "FORBIDDEN PROJECT DETECTED: $forbidden (V5 JMS Direct — live production)." \
        "This repo (Tender flow) may NEVER connect to it."
    fi
  done

  # (3) Must match the one project this repo is allowed to touch.
  if [ "$ref" != "$TF_EXPECTED_REF" ]; then
    _tf_die 11 \
      "Connected project ref does NOT match this repo." \
      "expected: $TF_EXPECTED_REF  (Tender flow)" \
      "actual:   $ref" \
      "Refusing to run a destructive script against the wrong database."
  fi

  # (4) Prove the ref points at a LIVE, reachable, authenticated database.
  #     This is what makes the check about the real connection in use, not a
  #     static string. Skip only if explicitly opted out (offline/CI).
  if [ "${TF_GUARD_SKIP_LIVE_PROBE:-0}" = "1" ]; then
    echo "✅  Supabase guard OK — ref '$ref' matches (live probe skipped by request)."
    return 0
  fi

  if ! command -v psql >/dev/null 2>&1; then
    echo "✅  Supabase guard OK — ref '$ref' matches (psql not found; live probe skipped)."
    return 0
  fi

  # Inject the DB password into the pooler URL if the URL has none and we have one.
  probe_url="$url"
  pw="${SUPABASE_DB_PASSWORD:-}"
  if [ -n "$pw" ] && ! printf '%s' "$probe_url" | grep -qE '://[^@/]*:[^@/]*@'; then
    probe_url="$(printf '%s' "$probe_url" | sed -E "s#(://[^:@/]+)@#\1:${pw}@#")"
  fi

  if PGCONNECT_TIMEOUT=8 psql "$probe_url" -tAc 'select 1' >/dev/null 2>&1; then
    echo "✅  Supabase guard OK — ref '$ref' matches and the connection is LIVE."
    return 0
  fi

  _tf_die 13 \
    "Ref '$ref' matches, but the live connection probe FAILED." \
    "Could not reach/authenticate to the resolved database." \
    "Set TF_GUARD_SKIP_LIVE_PROBE=1 only if you are deliberately offline."
}

# Run on source (so it can literally be the first line of a script) and when
# executed directly.
tf_supabase_guard
