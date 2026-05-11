# A to ㄱ Backend

Next.js 프론트엔드와 직접 연동되는 FastAPI 백엔드입니다. API prefix는 `/api/v1`이며, 프론트엔드 기본 설정인 `http://127.0.0.1:8000/api/v1`에 맞춰 동작합니다.

## 주요 특징

- 회원가입, 로그인, JWT Access/Refresh Token 인증
- PDF, DOCX, TXT 업로드 및 텍스트 추출
- 문서 번역, 요약, 태그, 노트, 문서 기반 AI 채팅
- 메타데이터 추출 및 유사 문서 추천
- CLOVA Studio OpenAI 호환 API 연동
- CLOVA API Key가 없어도 fallback/mock 흐름으로 로컬 테스트 가능

## API Prefix

- Health Check: `GET /health`
- API Base: `http://127.0.0.1:8000/api/v1`

예시:

- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`
- `GET /api/v1/documents`
- `POST /api/v1/documents`

## 설치 방법

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
```

Windows:

```powershell
.venv\Scripts\activate
```

패키지 설치:

```bash
pip install -r requirements.txt
```

## 환경 변수 설정

`.env.example`을 복사해 `.env`를 생성합니다.

```bash
cp .env.example .env
```

필수 항목:

- `JWT_SECRET_KEY`
- `DATABASE_URL`

선택 항목:

- `CLOVA_STUDIO_API_KEY`
- `CLOVA_STUDIO_BASE_URL`
- `CLOVA_CHAT_MODEL`
- `CLOVA_EMBEDDING_MODEL`

## 서버 실행

```bash
cd backend
uvicorn app.main:app --reload
```

## Swagger 문서

- Swagger UI: `http://127.0.0.1:8000/docs`
- OpenAPI JSON: `http://127.0.0.1:8000/openapi.json`

## 주요 API 목록

- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/refresh`
- `POST /api/v1/auth/logout`
- `GET /api/v1/auth/me`
- `POST /api/v1/documents`
- `GET /api/v1/documents`
- `GET /api/v1/documents/{document_id}`
- `DELETE /api/v1/documents/{document_id}`
- `PATCH /api/v1/documents/{document_id}/visibility`
- `POST /api/v1/documents/{document_id}/translation`
- `GET /api/v1/documents/{document_id}/translation`
- `POST /api/v1/documents/{document_id}/translation/selected`
- `POST /api/v1/documents/{document_id}/summary`
- `GET /api/v1/documents/{document_id}/summary`
- `POST /api/v1/documents/{document_id}/tags`
- `GET /api/v1/documents/{document_id}/tags`
- `POST /api/v1/documents/{document_id}/notes`
- `GET /api/v1/documents/{document_id}/notes`
- `PATCH /api/v1/notes/{note_id}`
- `DELETE /api/v1/notes/{note_id}`
- `POST /api/v1/documents/{document_id}/chat`
- `GET /api/v1/documents/{document_id}/chat`
- `POST /api/v1/documents/{document_id}/metadata`
- `GET /api/v1/documents/{document_id}/recommendations`

## CLOVA Studio API Key 설정

`.env`에 아래 값을 설정하면 실제 CLOVA Studio OpenAI 호환 API를 사용합니다.

```env
CLOVA_STUDIO_API_KEY=your-api-key
CLOVA_STUDIO_BASE_URL=https://clovastudio.stream.ntruss.com/v1/openai
CLOVA_CHAT_MODEL=HCX-005
CLOVA_EMBEDDING_MODEL=bge-m3
```

주의:

- API Key는 백엔드에서만 사용됩니다.
- 프론트엔드로 API Key를 전달하지 않습니다.

## Fallback 동작

`CLOVA_STUDIO_API_KEY`가 없거나 호출에 실패해도 다음 기능은 fallback/mock으로 동작합니다.

- 문서 번역
- 선택 텍스트 번역
- 요약 및 키워드 생성
- AI 채팅 답변
- 메타데이터 추출
- 임베딩 생성 및 추천 알고리즘

## 테스트 실행

```bash
cd backend
pytest
```

## 향후 개선 사항

- 도커 스크립트 작성
- 토큰 사용량 최적화
