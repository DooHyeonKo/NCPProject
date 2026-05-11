# Work Summary

이 문서는 현재까지 수행한 주요 작업을 정리합니다. API Key, 비밀번호, 토큰, 서버 접속 비밀번호 등 민감 정보는 포함하지 않습니다.

## 1. 파일 저장소 전환

- 기존 로컬 파일 저장 방식 대신 NCP Object Storage를 사용하도록 백엔드 업로드 흐름을 변경했습니다.
- `boto3` 기반 Object Storage 클라이언트를 추가했습니다.
- 문서 업로드 시 파일 바이트를 Object Storage에 저장하고, DB에는 object key와 문서 메타데이터를 저장하도록 수정했습니다.
- 파일 삭제 기능도 Object Storage object 삭제와 연동했습니다.
- Object key는 사용자와 문서 단위로 분리되는 경로 구조를 사용합니다.

## 2. PDF Document Reader 개선

- PDF 표시 문제를 줄이기 위해 브라우저가 직접 Object Storage presigned URL로 이동하지 않고 백엔드에서 PDF를 스트리밍하도록 변경했습니다.
- PDF viewer에서 필요한 Range request를 처리하도록 백엔드 문서 파일 응답을 개선했습니다.
- 프론트엔드 PDF worker는 CDN 기반으로 빌드되도록 조정해 Docker build 오류를 해결했습니다.

## 3. AI 및 문서 기능 점검 기반 정리

- 업로드 이후 텍스트 추출, 메타데이터 추출, 임베딩 생성 흐름이 Object Storage 기반 저장 방식과 함께 동작하도록 백엔드 서비스를 정리했습니다.
- AI 기능은 기존 CLOVA Studio 설정을 환경변수 기반으로 유지했습니다.
- Object Storage 업로드 실패와 문서 처리 실패가 분리되도록 서비스 레이어를 정리했습니다.

## 4. Docker 기반 실행 구성

- `docker-compose.yml`을 백엔드와 프론트엔드 컨테이너 중심으로 정리했습니다.
- 백엔드는 FastAPI 컨테이너로 실행되고, 프론트엔드는 Next.js production build로 실행됩니다.
- `.env.example`, `backend/.env.example`, `frontend/.env.example`을 추가 또는 정리해 배포 환경에서 필요한 값을 한눈에 볼 수 있게 했습니다.
- 실제 `.env` 파일은 Git에 포함하지 않도록 `.gitignore`를 보강했습니다.

## 5. NCP 3-Tier 배포 준비

- NCP 기준 3-Tier 구조를 문서화했습니다.
  - Web Tier: Nginx 및 Next.js frontend
  - Application Tier: FastAPI backend
  - Data Tier: NCP Cloud DB for PostgreSQL 및 NCP Object Storage
- 단일 서버 Docker Compose 배포와 WEB/WAS 분리 배포 방식을 모두 지원하도록 스크립트를 정리했습니다.
- WEB 서버용 배포 스크립트는 Nginx를 설치하고 `/api`, `/health`를 WAS로 프록시하도록 구성했습니다.
- WAS 서버용 배포 스크립트는 백엔드 환경변수 파일을 안전 권한으로 생성하고 백엔드 컨테이너를 실행하도록 구성했습니다.

## 6. NCP Init Script

- 교재 예제 Init Script를 변형해 프로젝트용 Init Script를 작성했습니다.
- SSH 포트 `22`를 유지하면서 `2200`을 추가로 열도록 `ssh.socket`과 `sshd_config`를 설정합니다.
- Docker, Git, curl, OpenSSH server를 설치합니다.
- `/opt/atoz1` 애플리케이션 디렉터리를 준비합니다.
- 선택적으로 `APP_REPO` 환경변수가 있으면 저장소를 clone할 수 있게 했습니다.

## 7. 시크릿 관리 및 커밋 안전장치

- `.gitignore`와 `backend/.gitignore`를 보강해 `.env`, 로컬 DB, 빌드 산출물, 가상환경, 키 파일이 커밋되지 않도록 했습니다.
- `scripts/check-secrets.sh`를 추가해 NCP 키, CLOVA 키, DB URL, JWT secret 등 민감 정보 패턴을 커밋 전 검사하도록 했습니다.
- 특정 실제 비밀번호 문자열이 검사 스크립트에 노출되지 않도록 일반화된 패턴으로 수정했습니다.
- `.githooks/pre-commit`과 `scripts/install-git-hooks.sh`를 추가해 로컬 pre-commit 검사를 쉽게 활성화할 수 있게 했습니다.
- Git 원격 URL에서 토큰이 포함되지 않도록 정리했습니다.

## 8. 서버 배포 작업

- NCP 서버에 프로젝트 파일을 `/opt/atoz1`로 전송했습니다.
- 서버에서 Init Script 흐름을 실행해 SSH `22/2200`, Docker, 기본 패키지 설치를 적용했습니다.
- 서버 전용 `.env` 파일을 생성하고 권한을 제한했습니다.
- Docker Compose로 백엔드와 프론트엔드를 빌드 및 실행했습니다.
- 서버의 공개 `80`, `3000` 포트가 외부에서 접근되지 않아, 공개 가능한 `8000` 포트에 Nginx edge 컨테이너를 붙여 프론트엔드와 API를 함께 제공하도록 구성했습니다.
- 외부 접근 기준 서비스 URL은 `http://<SERVER_PUBLIC_IP>:8000` 형식입니다.

## 9. 검증한 항목

- Python backend compile 및 테스트를 실행했습니다.
- Docker Compose 설정 검증을 수행했습니다.
- 프론트엔드 Docker production build를 확인했습니다.
- 서버 내부에서 컨테이너 상태를 확인했습니다.
- 외부에서 `/`와 `/health` 응답을 확인했습니다.
- 백엔드 컨테이너에서 DB 연결과 NCP Object Storage bucket 접근을 확인했습니다.
- 커밋 전 시크릿 검사와 diff whitespace 검사를 실행했습니다.

## 10. 남은 운영 권고

- 채팅, 로그, 저장소, 스크린샷 등에 노출된 적 있는 모든 키와 비밀번호는 교체해야 합니다.
- GitHub 토큰은 새로 발급하고 기존 노출 토큰은 폐기해야 합니다.
- 운영용 `JWT_SECRET_KEY`는 충분히 긴 랜덤 값으로 교체해야 합니다.
- NCP ACG에서 실제 운영 포트 정책을 확정해야 합니다. 현재 서버는 공개 `8000` 포트를 사용합니다.
- 장기 운영 시 Docker Compose server-only 구성도 저장소에 정식 반영하는 것이 좋습니다.
- Next.js 및 일부 npm dependency 보안 업데이트를 별도 작업으로 검토하는 것이 좋습니다.
