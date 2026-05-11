import logging
from urllib.parse import quote

from fastapi import APIRouter, Depends, File, Form, HTTPException, Request, UploadFile, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.database import get_db
from app.models import ChatMessage, Document, Note, User
from app.schemas import (
    ChatListResponse,
    ChatMessageResponse,
    ChatRequest,
    DocumentDetailResponse,
    DocumentListResponse,
    DocumentVisibilityRequest,
    DocumentVisibilityResponse,
    MessageResponse,
    MetadataResponse,
    NoteCreateRequest,
    NoteListResponse,
    NoteResponse,
    RecommendationResponse,
    SelectedTranslationRequest,
    SelectedTranslationResponse,
    SummaryResponse,
    TagRequest,
    TagResponse,
    TranslationRequest,
    TranslationResponse,
    UploadDocumentResponse,
)
from app.security import apply_rate_limit
from app.services.document_service import (
    add_document_tags,
    create_chat_message,
    create_document,
    create_note,
    create_summary,
    create_translation,
    extract_and_store_metadata,
    get_document_for_access,
    get_document_for_owner,
    get_latest_summary,
    get_latest_translation,
    run_translation,
    serialize_chat_message,
    serialize_summary,
    serialize_translation,
)
from app.services.object_storage import delete_object, get_object_stream
from app.services.recommendation_service import recommend_similar_documents
from app.utils.json_utils import loads_list

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/documents", tags=["documents"])


@router.post("", response_model=UploadDocumentResponse)
def upload_document(
    request: Request,
    files: list[UploadFile] = File(...),
    title: str | None = Form(default=None),
    is_public: str = Form(default="false"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not files:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="업로드할 파일을 선택하세요.")

    uploaded_documents = []
    normalized_is_public = is_public.lower() == "true"

    for index, upload_file in enumerate(files):
        document = create_document(
            db=db,
            current_user=current_user,
            upload_file=upload_file,
            title=title if len(files) == 1 and index == 0 else None,
            is_public=normalized_is_public,
        )
        uploaded_documents.append(
            {
                "document_id": document.id,
                "filename": document.original_filename,
            }
        )
        logger.info("파일 업로드: user=%s document=%s", current_user.id, document.id)

    first_document = uploaded_documents[0]
    return {
        "message": "문서가 업로드되었습니다." if len(uploaded_documents) == 1 else "문서들이 업로드되었습니다.",
        "document_id": first_document["document_id"],
        "filename": first_document["filename"],
        "uploaded_documents": uploaded_documents,
        "uploaded_count": len(uploaded_documents),
    }


@router.get("", response_model=DocumentListResponse)
def list_documents(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    documents = (
        db.query(Document)
        .filter(Document.user_id == current_user.id)
        .order_by(Document.created_at.desc(), Document.id.desc())
        .all()
    )
    return {"documents": documents}


@router.get("/{document_id}", response_model=DocumentDetailResponse)
def get_document(
    document_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return get_document_for_access(db, document_id, current_user)


@router.get("/{document_id}/file")
def get_document_file(
    document_id: int,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    document = get_document_for_access(db, document_id, current_user)
    object_stream = get_object_stream(document.file_path, request.headers.get("range"))
    headers = {
        "Accept-Ranges": "bytes",
        "Content-Length": str(object_stream.content_length),
        "Content-Disposition": (
            f'inline; filename="{quote(document.original_filename)}"; '
            f"filename*=UTF-8''{quote(document.original_filename)}"
        ),
    }
    if object_stream.content_range:
        headers["Content-Range"] = object_stream.content_range

    def stream_file():
        try:
            yield from object_stream.body.iter_chunks(chunk_size=1024 * 1024)
        finally:
            object_stream.body.close()

    return StreamingResponse(
        stream_file(),
        status_code=object_stream.status_code,
        media_type=object_stream.content_type,
        headers=headers,
    )


@router.delete("/{document_id}", response_model=MessageResponse)
def delete_document(
    document_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    document = get_document_for_owner(db, document_id, current_user)
    object_key = document.file_path

    db.delete(document)
    db.commit()

    delete_object(object_key)
    logger.info("Object Storage 파일 삭제 요청: user=%s document=%s key=%s", current_user.id, document_id, object_key)

    logger.info("문서 삭제 완료: user=%s document=%s", current_user.id, document_id)
    return {"message": "문서가 삭제되었습니다."}


@router.patch("/{document_id}/visibility", response_model=DocumentVisibilityResponse)
def update_visibility(
    document_id: int,
    payload: DocumentVisibilityRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    document = get_document_for_owner(db, document_id, current_user)
    document.is_public = payload.is_public
    db.commit()
    logger.info("공개 여부 변경: user=%s document=%s is_public=%s", current_user.id, document_id, payload.is_public)
    return {"message": "공개 여부가 변경되었습니다.", "is_public": document.is_public}


@router.post("/{document_id}/translation", response_model=TranslationResponse)
def translate_document(
    document_id: int,
    payload: TranslationRequest,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    apply_rate_limit(request, "translation", limit=20, window_seconds=60)
    document = get_document_for_owner(db, document_id, current_user)
    translation = create_translation(db, document, payload.source_language, payload.target_language)
    logger.info("번역 요청: user=%s document=%s", current_user.id, document_id)
    return serialize_translation(translation)


@router.get("/{document_id}/translation", response_model=TranslationResponse)
def get_translation(
    document_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    document = get_document_for_access(db, document_id, current_user)
    translation = get_latest_translation(db, document.id)
    if not translation:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="번역 결과가 없습니다.")
    return serialize_translation(translation)


@router.post("/{document_id}/translation/selected", response_model=SelectedTranslationResponse)
def translate_selected_text(
    document_id: int,
    payload: SelectedTranslationRequest,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    apply_rate_limit(request, "translation", limit=20, window_seconds=60)
    get_document_for_access(db, document_id, current_user)
    logger.info("선택 텍스트 번역 요청: user=%s document=%s", current_user.id, document_id)
    return {
        "translated_text": run_translation(payload.selected_text, payload.source_language, payload.target_language)
    }


@router.post("/{document_id}/summary", response_model=SummaryResponse)
def summarize_document(
    document_id: int,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    apply_rate_limit(request, "summary", limit=15, window_seconds=60)
    document = get_document_for_owner(db, document_id, current_user)
    summary = create_summary(db, document)
    logger.info("요약 요청: user=%s document=%s", current_user.id, document_id)
    return serialize_summary(summary)


@router.get("/{document_id}/summary", response_model=SummaryResponse)
def get_summary(
    document_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    document = get_document_for_access(db, document_id, current_user)
    summary = get_latest_summary(db, document.id)
    if not summary:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="요약 결과가 없습니다.")
    return serialize_summary(summary)


@router.post("/{document_id}/tags", response_model=TagResponse)
def add_tags(
    document_id: int,
    payload: TagRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    document = get_document_for_owner(db, document_id, current_user)
    tags = add_document_tags(db, document, payload.tags)
    logger.info("태그 추가: user=%s document=%s", current_user.id, document_id)
    return {"tags": tags}


@router.get("/{document_id}/tags", response_model=TagResponse)
def get_tags(
    document_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    document = get_document_for_access(db, document_id, current_user)
    return {"tags": loads_list(document.tags)}


@router.post("/{document_id}/notes", response_model=NoteResponse)
def add_note(
    document_id: int,
    payload: NoteCreateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    document = get_document_for_owner(db, document_id, current_user)
    note = create_note(db, current_user, document, payload.content, payload.selected_text, payload.page_number)
    logger.info("노트 생성: user=%s document=%s", current_user.id, document_id)
    return note


@router.get("/{document_id}/notes", response_model=NoteListResponse)
def get_notes(
    document_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    get_document_for_owner(db, document_id, current_user)
    notes = (
        db.query(Note)
        .filter(Note.document_id == document_id, Note.user_id == current_user.id)
        .order_by(Note.created_at.desc(), Note.id.desc())
        .all()
    )
    return {"notes": notes}


@router.post("/{document_id}/chat", response_model=ChatMessageResponse)
def chat_with_document(
    document_id: int,
    payload: ChatRequest,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    apply_rate_limit(request, "chat", limit=20, window_seconds=60)
    document = get_document_for_access(db, document_id, current_user)
    try:
        message = create_chat_message(db, current_user, document, payload.question)
    except HTTPException:
        logger.warning("Prompt Injection 차단: user=%s document=%s", current_user.id, document_id)
        raise
    logger.info("AI 채팅 요청: user=%s document=%s", current_user.id, document_id)
    return serialize_chat_message(message)


@router.get("/{document_id}/chat", response_model=ChatListResponse)
def get_chat_history(
    document_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    get_document_for_access(db, document_id, current_user)
    messages = (
        db.query(ChatMessage)
        .filter(ChatMessage.document_id == document_id, ChatMessage.user_id == current_user.id)
        .order_by(ChatMessage.created_at.asc(), ChatMessage.id.asc())
        .all()
    )
    return {"messages": [serialize_chat_message(message) for message in messages]}


@router.post("/{document_id}/metadata", response_model=MetadataResponse)
def extract_metadata(
    document_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    document = get_document_for_owner(db, document_id, current_user)
    metadata = extract_and_store_metadata(db, document)
    logger.info("메타데이터 추출 요청: user=%s document=%s", current_user.id, document_id)
    return {"document_id": document.id, **metadata}


@router.get("/{document_id}/recommendations", response_model=RecommendationResponse)
def get_recommendations(
    document_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    recommendations = recommend_similar_documents(db, document_id, current_user, top_k=5, min_score=0.4)
    logger.info("추천 요청: user=%s document=%s", current_user.id, document_id)
    return {"base_document_id": document_id, "recommendations": recommendations}
