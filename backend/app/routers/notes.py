import logging

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.database import get_db
from app.models import Note, User
from app.schemas import MessageResponse, NoteResponse, NoteUpdateRequest

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/notes", tags=["notes"])


@router.patch("/{note_id}", response_model=NoteResponse)
def update_note(
    note_id: int,
    payload: NoteUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    note = db.query(Note).filter(Note.id == note_id).first()
    if not note:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="노트를 찾을 수 없습니다.")
    if note.user_id != current_user.id:
        logger.warning("권한 위반: note update user=%s note=%s", current_user.id, note_id)
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="노트를 수정할 권한이 없습니다.")

    note.content = payload.content
    db.commit()
    db.refresh(note)
    return note


@router.delete("/{note_id}", response_model=MessageResponse)
def delete_note(
    note_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    note = db.query(Note).filter(Note.id == note_id).first()
    if not note:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="노트를 찾을 수 없습니다.")
    if note.user_id != current_user.id:
        logger.warning("권한 위반: note delete user=%s note=%s", current_user.id, note_id)
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="노트를 삭제할 권한이 없습니다.")

    db.delete(note)
    db.commit()
    return {"message": "노트가 삭제되었습니다."}
