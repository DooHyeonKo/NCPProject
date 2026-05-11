# NCP 3-Tier Deployment Guide

This project is deployed as a 3-tier service on Naver Cloud Platform.

## Tiers

- **Web tier**: Nginx public endpoint plus local `frontend` Next.js container.
- **Application tier**: `backend` FastAPI container on the WAS server.
- **Data tier**: NCP Cloud DB for PostgreSQL plus NCP Object Storage bucket.

The data tier is external managed infrastructure. Do not run PostgreSQL or file storage inside the app containers for production.

## NCP resources

1. WEB Server: Ubuntu 24.04 instance with public access to `80`.
2. WAS Server: Ubuntu 24.04 instance reachable from WEB on `8000`.
3. Cloud DB for PostgreSQL: allow inbound access from the WAS server security group.
4. Object Storage: bucket such as `atoz-upload-bucket`.
5. API Gateway or Load Balancer is optional. If omitted, expose only WEB `80` publicly.

## Recommended split-server deployment

### Init Script

When creating WEB and WAS servers in NCP, use `ncp-init-script.sh` or `init_script` as the server Init Script. It is based on the Ubuntu 24.04 lab example and does the following:

- keeps SSH on `22` and additionally opens `2200` through `ssh.socket`
- installs `git`, `curl`, `openssh-server`, and Docker
- prepares `/opt/atoz1`
- optionally clones `APP_REPO` when that environment variable is set

Clone the repository on both WEB and WAS servers.

```bash
sudo apt-get update -y
sudo apt-get install -y git
sudo git clone <repo-url> /opt/atoz1
cd /opt/atoz1
```

### WAS server

Run this on the WAS server. Use the Cloud DB private endpoint and the WEB public origin.

```bash
sudo bash scripts/deploy-was.sh "PRIVATE_CDB_ENDPOINT" "5432" "DB_NAME" "DB_USER" "http://WEB_PUBLIC_IP" "atoz-upload-bucket"
```

The script prompts for the DB password, JWT secret, CLOVA API key, and NCP Object Storage keys. It writes them to `/etc/atoz1/backend.env` with `600` permissions, builds the backend image, and starts the backend container on port `8000`.

### WEB server

Run this on the WEB server. Use the WAS server private IP or private DNS name.

```bash
sudo bash scripts/deploy-web.sh "WAS_PRIVATE_IP" "8000"
```

The script installs Nginx and Docker, builds the frontend with relative API URLs, starts Next.js on `127.0.0.1:3000`, and writes `/etc/nginx/conf.d/atoz-web.conf`.

Nginx routing:

- `/` -> local Next.js frontend
- `/api/*` -> WAS `http://WAS_PRIVATE_IP:8000/api/*`
- `/health` -> WAS `http://WAS_PRIVATE_IP:8000/health`

## Single-server Docker Compose option

For quick validation or a small demo, one server can run both containers with Docker Compose.

```bash
git clone <repo-url> /opt/atoz1
cd /opt/atoz1
cp .env.example .env
```

Edit `.env`.

```dotenv
PUBLIC_FRONTEND_ORIGIN=http://YOUR_SERVER_PUBLIC_IP:3000
NEXT_PUBLIC_API_BASE_URL=http://YOUR_SERVER_PUBLIC_IP:8000/api/v1
NEXT_PUBLIC_BACKEND_HEALTH_URL=http://YOUR_SERVER_PUBLIC_IP:8000/health
FRONTEND_ORIGIN=http://YOUR_SERVER_PUBLIC_IP:3000
DATABASE_URL=postgresql+psycopg://USER:PASSWORD@DB_HOST:5432/DB_NAME
NCP_OBJECT_STORAGE_BUCKET=atoz-upload-bucket
```

Deploy.

```bash
./scripts/deploy-ncp.sh
```

## ACG / firewall

- WEB server: allow TCP `80` from users, SSH `22` from administrator IPs.
- WAS server: allow TCP `8000` only from WEB server or WEB subnet, SSH `22` from administrator IPs.
- PostgreSQL: allow TCP `5432` only from WAS server or WAS subnet.
- Object Storage: allow outbound HTTPS `443` from WAS server.

## Verification

On WAS:

```bash
curl http://127.0.0.1:8000/health
docker logs --tail 100 atoz-backend
```

On WEB:

```bash
curl http://127.0.0.1/
curl http://WEB_PUBLIC_IP/health
curl http://WEB_PUBLIC_IP/api/v1/documents
```

In the UI, upload a PDF and verify:

- An object appears under `users/<user_id>/documents/` in Object Storage.
- The document reader renders the PDF.
- Chat, summary, translation, and recommendation endpoints return responses.

## Operational notes

- Keep `.env` out of Git. It contains database passwords and API keys.
- Rotate any key that was pasted into chat or committed by mistake.
- Rebuild the frontend whenever `NEXT_PUBLIC_*` values change because they are embedded at Next.js build time.
- For split-server deployment, the frontend is built with relative URLs (`/api/v1`, `/health`), so browser traffic goes through the WEB tier and Nginx forwards API traffic to the WAS tier.
