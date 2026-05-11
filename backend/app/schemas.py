from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator


class UserBase(BaseModel):
    email: EmailStr
    name: str


class UserResponse(UserBase):
    id: int
    role: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class RegisterRequest(UserBase):
    password: str = Field(min_length=8)


class RegisterResponse(BaseModel):
    message: str


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class LoginResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: UserResponse


class RefreshRequest(BaseModel):
    refresh_token: str


class RefreshResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class MessageResponse(BaseModel):
    message: str


class DocumentVisibilityRequest(BaseModel):
    is_public: bool


class DocumentVisibilityResponse(BaseModel):
    message: str
    is_public: bool


class DocumentItemResponse(BaseModel):
    id: int
    title: Optional[str]
    original_filename: str
    file_type: str
    file_size: int
    is_public: bool
    status: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class DocumentListResponse(BaseModel):
    documents: List[DocumentItemResponse]


class DocumentDetailResponse(DocumentItemResponse):
    original_text: Optional[str]


class UploadedDocumentItem(BaseModel):
    document_id: int
    filename: str


class UploadDocumentResponse(BaseModel):
    message: str
    document_id: Optional[int] = None
    filename: Optional[str] = None
    uploaded_documents: List[UploadedDocumentItem]
    uploaded_count: int


class TranslationRequest(BaseModel):
    source_language: str = "en"
    target_language: str = "ko"


class SelectedTranslationRequest(TranslationRequest):
    selected_text: str

    @field_validator("selected_text")
    @classmethod
    def validate_selected_text(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("selected_text가 비어 있습니다.")
        return value.strip()


class SelectedTranslationResponse(BaseModel):
    translated_text: str


class TranslationResponse(BaseModel):
    translation_id: int
    document_id: int
    source_language: str
    target_language: str
    translated_text: str
    translator: str
    created_at: datetime


class SummaryResponse(BaseModel):
    summary_id: int
    document_id: int
    summary_text: str
    keywords: List[str]
    created_at: datetime


class TagRequest(BaseModel):
    tags: List[str]


class TagResponse(BaseModel):
    tags: List[str]


class NoteCreateRequest(BaseModel):
    content: str
    selected_text: Optional[str] = None
    page_number: Optional[int] = None


class NoteUpdateRequest(BaseModel):
    content: str


class NoteResponse(BaseModel):
    id: int
    content: str
    selected_text: Optional[str]
    page_number: Optional[int]
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class NoteListResponse(BaseModel):
    notes: List[NoteResponse]


class ChatRequest(BaseModel):
    question: str

    @field_validator("question")
    @classmethod
    def validate_question(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("질문이 비어 있습니다.")
        return value.strip()


class ChatMessageResponse(BaseModel):
    chat_message_id: int
    document_id: int
    question: str
    answer: str
    created_at: datetime


class ChatListResponse(BaseModel):
    messages: List[ChatMessageResponse]


class MetadataResponse(BaseModel):
    document_id: int
    abstract: str
    tags: List[str]
    methods: List[str]
    datasets: List[str]
    research_field: Optional[str]
    published_year: Optional[int]


class RecommendationItemResponse(BaseModel):
    document_id: int
    title: Optional[str]
    similarity_score: float
    reason: Optional[str]


class RecommendationResponse(BaseModel):
    base_document_id: int
    recommendations: List[RecommendationItemResponse]
