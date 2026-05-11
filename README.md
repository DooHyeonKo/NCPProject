# NCPProject

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

## 도커를 이용한 배포 (Docker Deployment)

Naver Cloud Platform(NCP) 등 도커 환경이 갖춰진 서버에서 쉽게 배포할 수 있습니다.

1. **저장소 클론**:
   ```bash
   git clone https://github.com/DooHyeonKo/NCPProject.git
   cd NCPProject
   ```

2. **환경 변수 설정**:
   - `backend/.env` 및 `frontend/.env.local` 파일을 생성하고 필요한 설정을 완료합니다.

3. **도커 컴포즈 실행**:
   ```bash
   docker-compose up -d --build
   ```

백엔드는 `8000` 포트, 프론트엔드는 `3000` 포트에서 실행됩니다.
