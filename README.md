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

## 주요 기능
- **문서 업로드 및 관리**: PDF, DOCX, TXT 파일 지원
- **자동 메타데이터 추출**: 업로드된 문서의 핵심 정보 자동 분석
- **AI 기반 추천**: 사용자 관심사 및 문서 내용을 바탕으로 한 유사 문서 추천
- **문서 기반 AI 채팅**: 개별 문서 내용을 바탕으로 한 질문 및 답변
- **번역 및 요약**: CLOVA Studio를 활용한 고성능 텍스트 번역 및 요약
- **실시간 상태 모니터링**: 백엔드 서비스의 헬스 체크 기능
