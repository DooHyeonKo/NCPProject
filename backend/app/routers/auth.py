import logging

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.auth import build_login_payload, get_current_user, issue_new_access_token, persist_refresh_token, revoke_refresh_token
from app.database import get_db
from app.models import User
from app.schemas import LoginRequest, LoginResponse, MessageResponse, RefreshRequest, RefreshResponse, RegisterRequest, RegisterResponse, UserResponse
from app.security import apply_rate_limit, hash_password, verify_password

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=RegisterResponse)
def register(payload: RegisterRequest, request: Request, db: Session = Depends(get_db)):
    apply_rate_limit(request, "register", limit=5, window_seconds=60)
    existing = db.query(User).filter(User.email == payload.email).first()
    if existing:
        logger.warning("회원가입 중복 시도: %s", payload.email)
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="이미 가입된 이메일입니다.")

    user = User(
        email=payload.email,
        name=payload.name,
        hashed_password=hash_password(payload.password),
        role="USER",
    )
    db.add(user)
    db.commit()
    logger.info("회원가입 성공: %s", payload.email)
    return {"message": "회원가입이 완료되었습니다."}


@router.post("/login", response_model=LoginResponse)
def login(payload: LoginRequest, request: Request, db: Session = Depends(get_db)):
    apply_rate_limit(request, "login", limit=10, window_seconds=60)
    user = db.query(User).filter(User.email == payload.email).first()
    if not user or not verify_password(payload.password, user.hashed_password):
        logger.warning("로그인 실패: %s", payload.email)
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="이메일 또는 비밀번호가 올바르지 않습니다.")

    login_payload = build_login_payload(user)
    persist_refresh_token(db, user, login_payload["refresh_token"])
    logger.info("로그인 성공: %s", payload.email)
    return login_payload


@router.post("/refresh", response_model=RefreshResponse)
def refresh(payload: RefreshRequest, db: Session = Depends(get_db)):
    access_token = issue_new_access_token(db, payload.refresh_token)
    return {"access_token": access_token, "token_type": "bearer"}


@router.post("/logout", response_model=MessageResponse)
def logout(payload: RefreshRequest, db: Session = Depends(get_db)):
    revoke_refresh_token(db, payload.refresh_token)
    return {"message": "로그아웃되었습니다."}


@router.get("/me", response_model=UserResponse)
def me(current_user: User = Depends(get_current_user)):
    return current_user
