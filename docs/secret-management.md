# Secret Management

Use this checklist before committing or deploying.

## Rules

- Keep real values only in `.env` files on the server or developer machine.
- Commit only `.env.example` files with placeholders.
- Do not put API keys, database passwords, JWT secrets, SSH keys, or Object Storage keys in source files, Dockerfiles, scripts, README examples, or issue comments.
- Rotate any key that was pasted into chat, logs, screenshots, or Git history.

## Local files

Ignored files:

- `.env`
- `backend/.env`
- `frontend/.env.local`
- any `*.pem`, `*.key`, `*.p12`, or `secrets/` file

Template files safe to commit:

- `.env.example`
- `backend/.env.example`
- `frontend/.env.example`

## Pre-commit check

Install the optional Git hook once:

```bash
./scripts/install-git-hooks.sh
```

Run this before every commit:

```bash
./scripts/check-secrets.sh
git status --short --ignored
```

Expected result:

- `Secret scan passed for tracked and untracked commit candidates.`
- real `.env` files appear as ignored, not staged.

## If a secret was committed

1. Rotate the key or password immediately in NCP/CLOVA/DB.
2. Remove it from the working tree.
3. Rewrite Git history if the repository is not shared yet, or use GitHub secret scanning guidance if it is already pushed.
4. Force-push only after coordinating with collaborators.
