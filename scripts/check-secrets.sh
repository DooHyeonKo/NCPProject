#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

patterns=(
  'ncp_iam_[A-Za-z0-9]+'
  'nv-[A-Za-z0-9]{20,}'
  'postgresql\+psycopg://[^${[:space:]]+:[^${[:space:]]+@'
  'postgres[0-9][[:alnum:]%._~!+-]{3,}'
  'CLOVA_STUDIO_API_KEY=[^$[:space:]][^[:space:]]{11,}'
  'NCP_OBJECT_STORAGE_ACCESS_KEY=[^$[:space:]][^[:space:]]{11,}'
  'NCP_OBJECT_STORAGE_SECRET_KEY=[^$[:space:]][^[:space:]]{11,}'
  'JWT_SECRET_KEY=[^$[:space:]][A-Za-z0-9._~+/=-]{19,}'
)

allowlist='replace-with|YOUR_SERVER_PUBLIC_IP|USER:PASSWORD|your-api-key|your_clova|example|\.env\.example|docs/ncp-3tier-deployment\.md|scripts/check-secrets\.sh'

candidate_files="$(git ls-files --cached --others --exclude-standard)"
if [[ -z "$candidate_files" ]]; then
  echo "No tracked or untracked commit candidates to scan."
  exit 0
fi

found=0
for pattern in "${patterns[@]}"; do
  matches="$(printf '%s\n' "$candidate_files" | xargs -r grep -EnI "$pattern" 2>/dev/null | grep -Ev "$allowlist" || true)"
  if [[ -n "$matches" ]]; then
    printf 'Potential secret match for pattern: %s\n' "$pattern"
    printf '%s\n' "$matches"
    found=1
  fi
done

if (( found != 0 )); then
  echo "Secret scan failed. Remove secrets from tracked files before committing."
  exit 1
fi

echo "Secret scan passed for tracked and untracked commit candidates."
