#!/usr/bin/env bash
# End-to-end test of scripts/release.sh against a fake server. A temporary
# folder stands in for the server, and stand-ins for ssh, rsync, gh and npm run
# everything locally. No network access, nothing leaves this machine.
# Run: bash tests/release/test_release_flow.sh
set -uo pipefail

SRC="$(cd "$(dirname "$0")/../.." && pwd)"
T="$(mktemp -d /tmp/release-flow.XXXXXX)"
export FAKE_LOG="$T/npm.log"
PASS=0
FAIL=0
SERVER_PID=""
cleanup() { [[ -n "$SERVER_PID" ]] && kill "$SERVER_PID" 2>/dev/null; rm -rf "$T"; }
trap cleanup EXIT

ok() { PASS=$((PASS + 1)); echo "ok   $1"; }
bad() { FAIL=$((FAIL + 1)); echo "FAIL $1"; }

# --- fake server: release folders + a web server for the smoke test ----------------
mkdir -p "$T/server/web" "$T/server/releases" "$T/bin"
PORT="$(python3 -c 'import socket; s=socket.socket(); s.bind(("127.0.0.1",0)); print(s.getsockname()[1])')"
python3 -m http.server "$PORT" --bind 127.0.0.1 --directory "$T/server/web" >/dev/null 2>&1 &
SERVER_PID=$!

# --- stand-ins ---------------------------------------------------------------------
cat >"$T/bin/ssh" <<SH
#!/usr/bin/env bash
# Skip options and the host; run the remote command locally against the fake server.
while [[ \$# -gt 0 && "\$1" != bash ]]; do shift; done
RELEASE_TEST_ROOT="$T/server" exec "\$@"
SH
cat >"$T/bin/rsync" <<'SH'
#!/usr/bin/env bash
# Copy src/ to the local path after "host:" (the fake server shares this disk).
src="${@: -2:1}"; dest="${@: -1}"; dest="${dest##*:}"
cp -a "$src." "$dest"
SH
cat >"$T/bin/gh" <<'SH'
#!/usr/bin/env bash
c="${FAKE_CI:-success}"
printf 'Repo checks\tcompleted\t%s\nBuild and test\tcompleted\tsuccess\nCodeQL analysis\tcompleted\tsuccess\nZAP baseline scan\tcompleted\tsuccess\n' "$c"
SH
cat >"$T/bin/npm" <<'SH'
#!/usr/bin/env bash
# "npm run check:static" builds a tiny site; FAKE_BROKEN=1 builds one missing its script.
# "npm run test:e2e" fails when FAKE_E2E is "once" or "twice"; the rerun of the
# failed tests ("-- --last-failed") fails only for "twice".
# Like Playwright, a run that got to its tests records them in .last-run.json;
# FAKE_E2E=crash fails before that, leaving whatever file was there.
if [[ "$*" == "run test:e2e" ]]; then
  echo "e2e: first run" >>"$FAKE_LOG"
  [[ "${FAKE_E2E:-}" == crash ]] && exit 1
  mkdir -p test-results
  if [[ -z "${FAKE_E2E:-}" ]]; then
    echo '{"status":"passed","failedTests":[]}' >test-results/.last-run.json
    exit 0
  fi
  echo '{"status":"failed","failedTests":["abc-123"]}' >test-results/.last-run.json
  exit 1
fi
if [[ "$*" == "run test:e2e -- --last-failed" ]]; then
  echo "e2e: rerun of failed tests" >>"$FAKE_LOG"
  [[ "${FAKE_E2E:-}" != twice ]]
  exit
fi
if [[ "$*" == "run check:static" ]]; then
  rm -rf dist && mkdir -p dist/assets
  printf '<!doctype html><title>HeliRescue</title><script type="module" src="./assets/index-AbCd1234.js"></script>\n' >dist/index.html
  [[ "${FAKE_BROKEN:-}" == 1 ]] || echo "// game" >dist/assets/index-AbCd1234.js
fi
SH
chmod +x "$T/bin/"*

# --- a throwaway repo whose HEAD is origin/main ---------------------------------------
# The fake GitHub remote is named after this game (init-game.sh renames GAME_REPO).
GAME_REPO=helirescue
mkdir -p "$T/remote/soncsec" && git init -q --bare "$T/remote/soncsec/$GAME_REPO.git"
mkdir "$T/repo" && cd "$T/repo" || exit 1
git init -q -b main
# CI runners have no git identity; give this throwaway repo its own.
git config user.name test && git config user.email test@example.invalid
mkdir -p scripts deploy
cp "$SRC/scripts/release.sh" "$SRC/scripts/release-remote.sh" "$SRC/scripts/smoke_test.py" scripts/
printf 'dist/\ndeploy/server.env\ntest-results/\n' >.gitignore
printf '{"name": "helirescue"}\n' >package.json
git add -A && git commit -q -m init
git remote add origin "$T/remote/soncsec/$GAME_REPO.git" && git push -q origin main
touch "$T/fake_key"
printf 'SERVER=127.0.0.1:%s\nSSH_USER=deploy\nSSH_KEY=%s\n' "$PORT" "$T/fake_key" >deploy/server.env

release() { PATH="$T/bin:$PATH" bash scripts/release.sh "$@" 2>&1; }
live() { basename "$(readlink "$T/server/web/helirescue" 2>/dev/null)" 2>/dev/null; }
count() { find "$T/server/releases/helirescue" -mindepth 1 -maxdepth 1 -type d 2>/dev/null | wc -l; }

# --- the tests -------------------------------------------------------------------
# T1.3: a game can only release into its own slot.
with_change() { # file, sed expression, command... : run with a temporary edit, then undo it
  local file="$1" expr="$2"; shift 2
  sed -i "$expr" "$file"
  git diff --quiet && { echo "with_change: '$expr' changed nothing in $file"; return 99; }
  if ! git commit -qam tmp; then git checkout -q -- "$file"; echo "with_change: commit failed"; return 98; fi
  "$@"; local rc=$?
  git reset -q --hard HEAD~1
  return $rc
}
out="$(with_change scripts/release.sh 's/^SLUG=.*/SLUG=other-game/' release deploy)"
if [[ "$out" == *"refusing to release into another game's slot"* && "$(count)" == 0 && ! -e "$T/server/web/other-game" ]]; then
  ok "refuses another game's slug (package.json mismatch) and touches nothing"
else bad "other slug: $out"; fi
out="$(with_change scripts/release.sh 's/^SLUG=.*/SLUG=_portal/' release rollback)"
if [[ "$out" == *"reserved for the portal"* ]]; then ok "refuses the portal's slot"; else bad "_portal slug: $out"; fi
out="$(with_change package.json 's/helirescue/other-game/' release status)"
if [[ "$out" == *"package.json says 'other-game'"* ]]; then ok "refuses when package.json names another game"; else bad "pkg mismatch: $out"; fi
git remote set-url origin "$T/remote/soncsec/other-game.git"
out="$(release activate 20990101T000000Z-deadbeef)"
if [[ "$out" == *"this repo's origin is"* ]]; then ok "refuses when the repo is another game's"; else bad "origin mismatch: $out"; fi
git remote set-url origin "$T/remote/soncsec/$GAME_REPO.git"

out="$(FAKE_CI=failure release deploy)"
if [[ $? -ne 0 && "$out" == *"has not passed"* && "$(count)" == 0 ]]; then ok "refuses to release when CI failed"; else bad "CI gate: $out"; fi

echo dirty >untracked.txt
out="$(release deploy)"
if [[ $? -ne 0 && "$out" == *"working tree has changes"* ]]; then ok "refuses uncommitted changes"; else bad "dirty tree: $out"; fi
rm untracked.txt

out="$(release deploy --dry-run)"
if [[ $? -eq 0 && "$out" == *"Dry run"* && "$(count)" == 0 ]]; then ok "dry run uploads nothing"; else bad "dry run: $out"; fi

# Browser tests that fail on a busy machine are rerun once (owner, 2026-10-21).
: >"$FAKE_LOG"
out="$(FAKE_E2E=once release deploy --dry-run)"
if [[ $? -eq 0 && "$out" == *"rerunning only those, once"* && "$(grep -c . "$FAKE_LOG")" == 2 && "$(count)" == 0 ]]; then
  ok "browser tests that fail once pass on a single rerun of the failed tests"
else bad "rerun once: $out / $(cat "$FAKE_LOG")"; fi
: >"$FAKE_LOG"
out="$(FAKE_E2E=twice release deploy)"
if [[ $? -ne 0 && "$out" == *"failed again on the rerun"* && "$(grep -c . "$FAKE_LOG")" == 2 && "$(count)" == 0 ]]; then
  ok "browser tests that fail twice stop the release and upload nothing"
else bad "fail twice: $out / $(cat "$FAKE_LOG") (count $(count))"; fi
: >"$FAKE_LOG"
mkdir -p test-results && echo '{"status":"failed","failedTests":["old-1"]}' >test-results/.last-run.json
out="$(FAKE_E2E=crash release deploy --dry-run)"
if [[ $? -ne 0 && "$out" == *"without a list of failed tests"* && "$(grep -c . "$FAKE_LOG")" == 1 ]]; then
  ok "a browser run that records no failed tests is not rerun, even with an old results file"
else bad "crash: $out / $(cat "$FAKE_LOG")"; fi

out="$(release deploy)"; first="$(live)"
if [[ $? -eq 0 && -n "$first" && "$out" == *"smoke test: passed"* ]]; then ok "first release goes live and passes the smoke test"; else bad "first release: $out"; fi

sleep 1 # release ids have one-second resolution
out="$(release deploy)"; second="$(live)"
if [[ $? -eq 0 && "$second" != "$first" && "$(count)" == 2 ]]; then ok "second release replaces the first"; else bad "second release: $out"; fi
a="$T/server/releases/helirescue/$first/assets/index-AbCd1234.js"
b="$T/server/releases/helirescue/$second/assets/index-AbCd1234.js"
if [[ -f "$a" && -f "$b" ]]; then ok "both releases keep their files"; else bad "release files missing"; fi

sleep 1
out="$(FAKE_BROKEN=1 release deploy)"
if [[ $? -ne 0 && "$out" == *"rolling back"* && "$(live)" == "$second" ]]; then ok "a broken release fails the smoke test and is rolled back automatically"; else bad "broken release: $out (live=$(live))"; fi

out="$(release rollback)"
if [[ $? -eq 0 && "$(live)" == "$first" ]]; then ok "rollback command returns to the earlier release"; else bad "rollback: $out"; fi

out="$(release activate "$second")"
if [[ $? -eq 0 && "$(live)" == "$second" && "$out" == *"smoke test: passed"* ]]; then ok "activate switches forward to a chosen release"; else bad "activate: $out"; fi
out="$(release activate 20990101T000000Z-deadbeef)"
if [[ $? -ne 0 && "$out" == *"no such release"* && "$(live)" == "$second" ]]; then ok "activate refuses an unknown release and changes nothing"; else bad "activate unknown: $out"; fi
release rollback >/dev/null

out="$(release status)"
if [[ "$out" == *"* $first (live)"* ]]; then ok "status shows the live release"; else bad "status: $out"; fi

for _ in 1 2 3 4 5; do sleep 1; release deploy >/dev/null; done
if [[ "$(count)" -eq 5 && -d "$T/server/releases/helirescue/$(live)" ]]; then ok "old releases are pruned to the newest 5, including the live one"; else bad "count is $(count)"; fi

echo
echo "$PASS passed, $FAIL failed"
[[ $FAIL -eq 0 ]]
