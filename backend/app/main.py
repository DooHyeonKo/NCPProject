import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import Base, engine
from app.routers import auth, documents, health, notes

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
)

app = FastAPI(
    title="A to ㄱ Backend",
    description="Next.js 프론트엔드와 연동되는 FastAPI 백엔드",
    version="1.0.0",
)

@app.on_event("startup")
def _init_db() -> None:
    # Avoid crashing the whole API on boot if the configured DB is unreachable.
    # Health check and non-DB endpoints should still work, and the log points
    # developers to DATABASE_URL issues.
    try:
        Base.metadata.create_all(bind=engine)
    except Exception:
        logging.exception(
            "Database init failed. Check DATABASE_URL in backend/.env (or environment)."
        )

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(auth.router, prefix="/api/v1")
app.include_router(documents.router, prefix="/api/v1")
app.include_router(notes.router, prefix="/api/v1")
