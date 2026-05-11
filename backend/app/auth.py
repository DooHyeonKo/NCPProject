from datetime import datetime, timedelta

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import RefreshToken, User
from app.config import settings
from app.security import create_access_token, create_refresh_token, decode_token

bearer_scheme = HTTPBearer(auto_error=False)


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> User:
    if not credentials or not credentials.credentials:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="인증이 필요합니다.")

    payload = decode_token(credentials.credentials, expected_type="access")
    user_id = payload.get("sub")
    user = db.query(User).filter(User.id == int(user_id)).first() if user_id else None
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="사용자를 찾을 수 없습니다.")
    return user


def build_login_payload(user: User) -> dict:
    return {
        "access_token": create_access_token(user.id),
        "refresh_token": create_refresh_token(user.id),
        "token_type": "bearer",
        "user": user,
    }


def persist_refresh_token(db: Session, user: User, token: str) -> RefreshToken:
    refresh = RefreshToken(
        user_id=user.id,
        token=token,
        expires_at=datetime.utcnow() + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
        revoked=False,
    )
    db.add(refresh)
    db.commit()
    db.refresh(refresh)
    return refresh


def revoke_refresh_token(db: Session, token: str) -> None:
    record = db.query(RefreshToken).filter(RefreshToken.token == token).first()
    if record:
        record.revoked = True
        db.commit()


def issue_new_access_token(db: Session, refresh_token: str) -> str:
    payload = decode_token(refresh_token, expected_type="refresh")
    record = db.query(RefreshToken).filter(RefreshToken.token == refresh_token).first()
    if not record or record.revoked or record.expires_at < datetime.utcnow():
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="유효하지 않은 리프레시 토큰입니다.")

    user_id = payload.get("sub")
    user = db.query(User).filter(User.id == int(user_id)).first() if user_id else None
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="사용자를 찾을 수 없습니다.")
    return create_access_token(user.id)
