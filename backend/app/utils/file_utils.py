import uuid
from pathlib import Path

from fastapi import HTTPException, UploadFile, status

from app.config import settings

ALLOWED_EXTENSIONS = {".pdf", ".docx", ".txt"}
ALLOWED_MIME_TYPES = {
    ".pdf": {"application/pdf", "application/octet-stream"},
    ".docx": {
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/octet-stream",
    },
    ".txt": {"text/plain", "application/octet-stream"},
}


def validate_upload_file(upload_file: UploadFile, file_size: int) -> str:
    suffix = Path(upload_file.filename or "").suffix.lower()
    if suffix not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="지원하지 않는 파일 형식입니다.")

    if upload_file.content_type not in ALLOWED_MIME_TYPES[suffix]:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="허용되지 않은 MIME 타입입니다.")

    if file_size > settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="파일 크기 제한을 초과했습니다.")

    return suffix.lstrip(".")


def build_object_key(original_filename: str, *, user_id: int | None = None) -> str:
    suffix = Path(original_filename).suffix.lower()
    stored_filename = f"{uuid.uuid4().hex}{suffix}"
    if user_id is None:
        return stored_filename
    return f"users/{user_id}/documents/{stored_filename}"
