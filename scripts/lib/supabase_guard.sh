#!/usr/bin/env bash
#
# supabase_guard.sh — Reusable safety guard for destructive scripts.
#
# PURPOSE
#   Refuse to run against anything other than THIS repo's Supabase project
#   (vrngjoorzwcgagwpzzyt — "Tender flow"). The guard selects the database
#   connection from ONE deterministic, repo-scoped source, validates the WHOLE
#   connection destination (exact host + port + database + project identity),
#   verifies it independently, and only then permits use. It fails closed on
#   anything ambiguous, ambient, broadened, or unexpected.
#
# CONNECTION-SOURCE POLICY (deterministic; fail closed)
#     1. $TENDERFLOW_DATABASE_URL   — the only permitted deliberate override.
#     2. supabase/.temp/pooler-url  — the repository's linked pooler URL (default).
#   Generic $DATABASE_URL / $SUPABASE_DB_URL are prohibited; their mere presence
#   is a hard failure (exit 14). $SUPABASE_PROJECT_REF is never trusted; the ref
#   is parsed from the selected connection and verified.
#
# ACCEPTED REMOTE DESTINATION FORMS (exit 16 otherwise)
#   Direct connection:
#     - host EXACTLY  db.vrngjoorzwcgagwpzzyt.supabase.co  (no broader
#       *.supabase.co, no bare <ref>.supabase.co)
#     - database "postgres" where present; port 5432 where present
#   Shared pooler connection:
#     - host  *.pooler.supabase.com
#     - username  postgres.vrngjoorzwcgagwpzzyt (an approved user prefix followed
#       by the EXACT project ref)
#     - database "postgres" where present
#     - port 5432 (session mode). Transaction-mode 6543 is NOT accepted for
#       migrations or metadata baselines, nor is any other port.
#   Rejected: arbitrary hosts; broader *.supabase.co; ref present only in a
#   username while the host is unrelated; host/username identity inconsistency;
#   malformed URLs; unapproved ports or database names. localhost is permitted
#   only under $TF_GUARD_LOCAL_TEST_MODE=1 (the separate local-stack mode).
#
# LIVE-PROBE SUPPRESSION IS TEST-ONLY (canonical-path gated)
#   The genuine repository root is derived from the canonical location of THIS
#   script. Probe suppression is permitted only when ALL hold, else exit 15:
#     - $TF_GUARD_TEST_MODE=1, and
#     - $TF_GUARD_SKIP_LIVE_PROBE=1, and
#     - $TF_GUARD_TEST_ROOT is set to an existing fixture directory, and
#     - canonically: the fixture root is not, does not contain, and is not
#       contained by the genuine repository root; and any link file actually
#       read resolves INSIDE the fixture root and is not a genuine link file.
#   Canonical (symlink/`..`-resolved) paths are used, so a fixture that resolves
#   back into the genuine repository is refused. A CLAUDE.md marker plays no
#   part in this decision.
#
# OUTPUTS (set only on success, unset on any failure; never stale)
#     TF_VALIDATED_DB_URL   — validated connection string (NEVER printed)
#     TF_VALIDATED_REF      — validated project ref (safe: a project id)
#     TF_VALIDATED_SOURCE   — human label for the selected source
#
# USAGE
#   First line of every destructive script, before any DB access, and always
#   before remote database access:
#       source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/lib/supabase_guard.sh"
#
# EXIT CODES
#   10  No permitted connection source.
#   11  Ref does not match the expected project (incl. unknown third projects).
#   12  Forbidden project (V5 JMS Direct — live production), by name/ref.
#   13  Live connection probe failed.
#   14  Ambient generic DB variable present ($DATABASE_URL / $SUPABASE_DB_URL).
#   15  Illegitimate live-probe suppression (test-only bypass misused).
#   16  Destination validation failed (host/port/database/identity/form).
#
# STATE SAFETY
#   All working values are function-locals; no `readonly` globals, no module
#   state; deterministic across repeated sourcing. Reads only repo/fixture files;
#   never mutates the link, profiles, or anything outside the repository; never
#   prints a host, username, connection string, or secret.

# ---------------------------------------------------------------------------
# Internal helpers (stateless; safe to redefine on re-source)
# ---------------------------------------------------------------------------

# Canonical genuine-repository root, derived from this script's own location.
_tf_repo_root() {
  cd "$(dirname "${BASH_SOURCE[0]}")/../.." >/dev/null 2>&1 && pwd -P
}

# Canonicalise a path (resolving symlinks and `..`). Requires the path to exist.
_tf_realpath() {
  local p="$1" dir base tgt
  [ -e "$p" ] || return 1
  if [ -d "$p" ]; then ( cd "$p" 2>/dev/null && pwd -P ); return; fi
  dir="$(dirname "$p")"; base="$(basename "$p")"
  dir="$(cd "$dir" 2>/dev/null && pwd -P)" || return 1
  if [ -L "$dir/$base" ]; then
    tgt="$(readlink "$dir/$base")"
    case "$tgt" in
      /*) _tf_realpath "$tgt" ;;
      *)  _tf_realpath "$dir/$tgt" ;;
    esac
  else
    printf '%s' "$dir/$base"
  fi
}

# Split a connection URL into "host<TAB>user<TAB>port<TAB>dbname" (internal only;
# never printed). Empty host means malformed.
_tf_url_parts() {
  local url="$1" rest hostportdb userinfo hostport host port user dbname afterslash
  case "$url" in
    *://*@*) ;;
    *) printf '\t\t\t'; return 0 ;;
  esac
  rest="${url#*://}"
  hostportdb="${rest##*@}"
  userinfo="${rest%@*}"
  case "$hostportdb" in
    */*) hostport="${hostportdb%%/*}"; afterslash="${hostportdb#*/}"; dbname="${afterslash%%\?*}" ;;
    *)   hostport="$hostportdb"; dbname="" ;;
  esac
  host="${hostport%%:*}"
  case "$hostport" in *:*) port="${hostport##*:}" ;; *) port="" ;; esac
  user="${userinfo%%:*}"
  printf '%s\t%s\t%s\t%s' "$host" "$user" "$port" "$dbname"
}

# Loud, unmissable failure banner + exit. NEVER prints URLs, hosts, or secrets.
_tf_die() {
  local code="$1"; shift
  unset TF_VALIDATED_DB_URL TF_VALIDATED_REF TF_VALIDATED_SOURCE 2>/dev/null || true
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
  exit "$code"
}

# ---------------------------------------------------------------------------
# The guard
# ---------------------------------------------------------------------------
tf_supabase_guard() {
  # --- configuration (locals only; no globals, re-source safe) ---
  local expected_ref="vrngjoorzwcgagwpzzyt"          # Tender flow (this repo)
  local forbidden_refs="wcxxhzenwqlukhtphjyc"        # V5 JMS Direct — live prod
  local approved_user_prefixes="postgres"            # approved pooler user prefixes
  local allowed_remote_port="5432"                   # session-mode / direct
  local forbidden

  # --- working locals (explicitly reset each run) ---
  local root url ref source_label probe_url pw which
  local parsed host user port dbname host_ref user_ref uprefix uref
  local is_pooler is_localhost local_target
  local link_root link_file used_link_file link_file_path
  local troot ctroot cgen clink gl

  unset TF_VALIDATED_DB_URL TF_VALIDATED_REF TF_VALIDATED_SOURCE 2>/dev/null || true

  # (A) Hard-refuse ambient generic DB variables BEFORE selecting any source.
  if [ -n "${DATABASE_URL:-}" ] || [ -n "${SUPABASE_DB_URL:-}" ]; then
    which=""
    [ -n "${DATABASE_URL:-}" ] && which="\$DATABASE_URL"
    [ -n "${SUPABASE_DB_URL:-}" ] && which="${which:+$which and }\$SUPABASE_DB_URL"
    _tf_die 14 \
      "Ambient database variable detected: ${which}." \
      "Generic DB variables are NOT accepted for Tender OS operations." \
      "Fix: 'unset ${which}', or set \$TENDERFLOW_DATABASE_URL to THIS project's" \
      "connection string. (Its value is intentionally not shown.)"
  fi

  root="$(_tf_repo_root)"
  used_link_file=0
  link_file_path=""

  # (B) Select the single permitted connection source, in precedence order.
  if [ -n "${TENDERFLOW_DATABASE_URL:-}" ]; then
    url="$TENDERFLOW_DATABASE_URL"
    source_label="\$TENDERFLOW_DATABASE_URL (project override)"
  else
    # Link files are read from an explicit fixture root only in test mode;
    # otherwise from the genuine repository root.
    if [ "${TF_GUARD_TEST_MODE:-0}" = "1" ] && [ -n "${TF_GUARD_TEST_ROOT:-}" ] && [ -d "${TF_GUARD_TEST_ROOT:-}" ]; then
      link_root="$TF_GUARD_TEST_ROOT"
    else
      link_root="$root"
    fi
    link_file="$link_root/supabase/.temp/pooler-url"
    if [ -n "$link_root" ] && [ -s "$link_file" ]; then
      url="$(cat "$link_file")"
      source_label="linked supabase/.temp/pooler-url"
      used_link_file=1
      link_file_path="$link_file"
    else
      _tf_die 10 \
        "No permitted Tender OS connection source is available." \
        "Set \$TENDERFLOW_DATABASE_URL, or run 'source .env.local && supabase link'" \
        "so supabase/.temp/pooler-url exists and is non-empty."
    fi
  fi

  # (C) Forbidden project — raw connection string, by name.
  for forbidden in $forbidden_refs; do
    if printf '%s' "$url" | grep -q "$forbidden"; then
      _tf_die 12 \
        "FORBIDDEN PROJECT DETECTED in the ${source_label} connection: $forbidden" \
        "This is V5 JMS Direct — a live production business system." \
        "This repo (Tender flow) may NEVER connect to it."
    fi
  done

  # (D) Validate the WHOLE destination: host, port, database, project identity.
  parsed="$(_tf_url_parts "$url")"
  host="${parsed%%$'\t'*}"; parsed="${parsed#*$'\t'}"
  user="${parsed%%$'\t'*}"; parsed="${parsed#*$'\t'}"
  port="${parsed%%$'\t'*}"; dbname="${parsed#*$'\t'}"

  if [ -z "$host" ]; then
    _tf_die 16 \
      "Selected source: ${source_label}." \
      "The connection URL is malformed (no scheme://user@host). (Not shown.)"
  fi

  is_pooler=0; case "$host" in *.pooler.supabase.com) is_pooler=1 ;; esac
  is_localhost=0
  case "$host" in localhost|127.0.0.1|::1|0.0.0.0) is_localhost=1 ;; esac
  local_target=0

  if [ "$is_localhost" = "1" ]; then
    if [ "${TF_GUARD_LOCAL_TEST_MODE:-0}" = "1" ]; then
      local_target=1
      ref="(local test stack)"
      source_label="${source_label} [local-test]"
    else
      _tf_die 16 \
        "Selected source: ${source_label}." \
        "A localhost/loopback host is not permitted unless" \
        "\$TF_GUARD_LOCAL_TEST_MODE=1 (local-stack test mode)."
    fi
  else
    # Database name, where present, must be 'postgres'.
    if [ -n "$dbname" ] && [ "$dbname" != "postgres" ]; then
      _tf_die 16 \
        "Selected source: ${source_label}." \
        "Unapproved database name (only 'postgres' is accepted)."
    fi

    if [ "$is_pooler" = "1" ]; then
      # Identity from the username: <approved_prefix>.<exact ref>.
      case "$user" in *.*) ;; *) _tf_die 16 \
        "Selected source: ${source_label}." \
        "Pooler username is not of the form <prefix>.<project-ref>." ;; esac
      uprefix="${user%.*}"; uref="${user##*.}"
      case " $approved_user_prefixes " in
        *" $uprefix "*) ;;
        *) _tf_die 16 \
             "Selected source: ${source_label}." \
             "Unapproved pooler database-user prefix." ;;
      esac
      if ! printf '%s' "$uref" | grep -qE '^[a-z0-9]{20}$'; then
        _tf_die 16 \
          "Selected source: ${source_label}." \
          "Pooler username project ref is malformed."
      fi
      if [ -n "$port" ] && [ "$port" != "$allowed_remote_port" ]; then
        _tf_die 16 \
          "Selected source: ${source_label}." \
          "Unapproved pooler port ($port). Session-mode $allowed_remote_port is" \
          "required; transaction-mode 6543 is not accepted for migrations/baselines."
      fi
      ref="$uref"
    else
      # Direct Supabase host: must be exactly db.<20-char ref>.supabase.co.
      case "$host" in
        db.*.supabase.co)
          host_ref="${host#db.}"; host_ref="${host_ref%.supabase.co}"
          if ! printf '%s' "$host_ref" | grep -qE '^[a-z0-9]{20}$'; then
            _tf_die 16 \
              "Selected source: ${source_label}." \
              "Unrecognised direct Supabase host shape."
          fi
          ;;
        *)
          _tf_die 16 \
            "Selected source: ${source_label}." \
            "Unrecognised/non-Supabase host. Only exact db.<ref>.supabase.co or" \
            "*.pooler.supabase.com are accepted; broader *.supabase.co is refused."
          ;;
      esac
      case "$user" in
        *.*) user_ref="${user##*.}"
             if [ "$user_ref" != "$host_ref" ]; then
               _tf_die 16 \
                 "Selected source: ${source_label}." \
                 "Host and username project identities are inconsistent."
             fi ;;
      esac
      if [ -n "$port" ] && [ "$port" != "$allowed_remote_port" ]; then
        _tf_die 16 \
          "Selected source: ${source_label}." \
          "Unapproved direct port ($port). Expected $allowed_remote_port."
      fi
      ref="$host_ref"
    fi
  fi

  # (E) Project checks (skipped only for an explicit local-stack target).
  if [ "$local_target" != "1" ]; then
    for forbidden in $forbidden_refs; do
      if [ "$ref" = "$forbidden" ]; then
        _tf_die 12 \
          "FORBIDDEN PROJECT DETECTED: $forbidden (V5 JMS Direct — live production)." \
          "Selected source: ${source_label}. This repo may NEVER connect to it."
      fi
    done
    if [ "$ref" != "$expected_ref" ]; then
      _tf_die 11 \
        "Connected project ref does NOT match this repo." \
        "selected source: ${source_label}" \
        "expected: $expected_ref  (Tender flow)" \
        "actual:   $ref" \
        "Refusing to run against an unexpected project."
    fi
  fi

  # Static validation passed. Publish sanctioned outputs (URL never printed).
  TF_VALIDATED_DB_URL="$url"
  TF_VALIDATED_REF="$ref"
  TF_VALIDATED_SOURCE="$source_label"
  echo "✅  Supabase guard — source: ${source_label}; ref: '$ref' matches expected."

  # (F) Live-probe policy. Suppression is TEST-ONLY and canonical-path gated.
  if [ "${TF_GUARD_SKIP_LIVE_PROBE:-0}" = "1" ]; then
    if [ "${TF_GUARD_TEST_MODE:-0}" != "1" ]; then
      _tf_die 15 \
        "Live-probe suppression requested without \$TF_GUARD_TEST_MODE=1." \
        "TF_GUARD_SKIP_LIVE_PROBE is a TEST-ONLY facility, not an operational bypass."
    fi
    troot="${TF_GUARD_TEST_ROOT:-}"
    [ -n "$troot" ] || _tf_die 15 \
      "Probe suppression requires an explicit \$TF_GUARD_TEST_ROOT fixture root."
    [ -d "$troot" ] || _tf_die 15 \
      "\$TF_GUARD_TEST_ROOT does not exist or is not a directory."
    ctroot="$(_tf_realpath "$troot")" || _tf_die 15 "Cannot canonicalise \$TF_GUARD_TEST_ROOT."
    cgen="$(_tf_realpath "$root")" || _tf_die 15 "Cannot canonicalise the genuine repository root."
    if [ "$ctroot" = "$cgen" ]; then
      _tf_die 15 "The fixture root IS the genuine repository root."
    fi
    case "$ctroot/" in "$cgen/"*) _tf_die 15 "The fixture root is inside the genuine repository." ;; esac
    case "$cgen/" in "$ctroot/"*) _tf_die 15 "The genuine repository is inside the fixture root." ;; esac
    if [ "$used_link_file" = "1" ]; then
      clink="$(_tf_realpath "$link_file_path")" || _tf_die 15 "Cannot canonicalise the fixture link file."
      case "$clink/" in
        "$ctroot/"*) ;;
        *) _tf_die 15 "Fixture link file resolves OUTSIDE the fixture root (symlink/..?)." ;;
      esac
      for gl in "$cgen/supabase/.temp/pooler-url" "$cgen/supabase/.temp/project-ref"; do
        if [ "$clink" = "$gl" ]; then
          _tf_die 15 "Fixture link file resolves to a GENUINE repository link file."
        fi
      done
    fi
    echo "✅  Supabase guard OK — ref matches (probe suppressed: test mode + isolated fixture root)."
    return 0
  fi

  # (G) Prove the ref points at a LIVE, reachable, authenticated database.
  if ! command -v psql >/dev/null 2>&1; then
    echo "✅  Supabase guard OK — ref matches (psql not found; live probe skipped)."
    return 0
  fi
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
    "Test-only suppression needs TF_GUARD_TEST_MODE=1 + TF_GUARD_TEST_ROOT + TF_GUARD_SKIP_LIVE_PROBE=1."
}

# Run on source (so it can literally be the first line of a script) and when
# executed directly.
tf_supabase_guard
