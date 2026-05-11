# A to ㄱ

FastAPI 백엔드와 Next.js 프론트엔드로 구성된 풀스택 문서 번역 및 학습 지원 서비스입니다.

## 프로젝트 구조

- **`backend/`**: FastAPI 서버로, 문서 처리, 메타데이터 추출, AI 기반 추천 및 채팅 기능을 담당합니다.
- **`frontend/`**: Next.js (TypeScript) 대시보드로, 사용자가 문서를 관리하고 AI 분석 결과를 확인할 수 있는 UI를 제공합니다.

## 시작하기

### 백엔드 설정 (Backend Setup)
1. `backend` 디렉토리로 이동합니다.
2. 가상 환경을 생성합니다: `python -m venv .venv`
3. 가상 환경을 활성화합니다: `source .venv/bin/activate` (Windows: `.venv\Scripts\activate`)
4. 필요한 패키지를 설치합니다: `pip install -r requirements.txt`
5. `.env.example`을 참고하여 `.env` 파일을 생성하고 환경 변수를 설정합니다.
6. 서버를 실행합니다: `uvicorn app.main:app --reload`

### 프론트엔드 설정 (Frontend Setup)
1. `frontend` 디렉토리로 이동합니다.
2. 패키지를 설치합니다: `npm install`
3. `.env.example`을 참고하여 `.env.local` 파일을 생성하고 환경 변수를 설정합니다.
4. 개발 서버를 실행합니다: `npm run dev`

## NCP 3-Tier 배포

Naver Cloud Platform 기준 3-Tier 구조로 배포합니다.

- **Web Tier**: Nginx + Next.js `frontend`, 사용자 브라우저가 접근
- **Application Tier**: FastAPI `backend`, 인증/API/AI 처리
- **Data Tier**: NCP Cloud DB for PostgreSQL + NCP Object Storage

서버 생성 시 `ncp-init-script.sh` 또는 `init_script`를 Init Script로 사용하면 SSH `22/2200` 포트 설정, Docker 설치, `/opt/atoz1` 디렉터리 준비까지 처리합니다.

분리 배포:

```bash
# WAS 서버
sudo bash scripts/deploy-was.sh "PRIVATE_CDB_ENDPOINT" "5432" "DB_NAME" "DB_USER" "http://WEB_PUBLIC_IP" "atoz-upload-bucket"

# WEB 서버
sudo bash scripts/deploy-web.sh "WAS_PRIVATE_IP" "8000"
```

단일 서버 Docker Compose 실행:

```bash
git clone <repo-url> /opt/atoz1
cd /opt/atoz1
cp .env.example .env
vi .env
./scripts/deploy-ncp.sh
```

필수 NCP 리소스:

- Cloud DB for PostgreSQL: `DATABASE_URL`에 연결 문자열 설정
- Object Storage: `NCP_OBJECT_STORAGE_BUCKET`, Access Key, Secret Key 설정
- ACG: `3000`, `8000` 공개, DB `5432`는 백엔드 서버에서만 허용

자세한 절차는 `docs/ncp-3tier-deployment.md`를 참고하세요.

## Docker 실행

```bash
cp .env.example .env
docker compose up -d --build
docker compose ps
```

백엔드는 `8000` 포트, 프론트엔드는 `3000` 포트에서 실행됩니다. `NEXT_PUBLIC_*` 값은 프론트엔드 빌드 시점에 포함되므로 변경 후에는 반드시 재빌드하세요.

## 커밋 전 시크릿 점검

실제 API Key, DB 비밀번호, Object Storage Key는 `.env`에만 보관하고 Git에는 커밋하지 않습니다.

```bash
./scripts/check-secrets.sh
git status --short --ignored
```

자세한 기준은 `docs/secret-management.md`를 참고하세요.
