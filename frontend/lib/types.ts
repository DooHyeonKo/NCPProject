export interface User {
  id: number;
  email: string;
  name: string;
  role: string;
  created_at: string;
}

export interface LoginResponse {
  access_token: string;
  refresh_token: string;
  token_type: "bearer";
  user: User;
}

export interface RegisterResponse {
  message: string;
}

export interface DocumentItem {
  id: number;
  title: string | null;
  original_filename: string;
  file_type: string;
  file_size: number;
  is_public: boolean;
  status: "UPLOADED" | "TRANSLATED" | string;
  created_at: string;
  updated_at: string;
}

export interface DocumentListResponse {
  documents: DocumentItem[];
}

export interface DocumentDetail extends DocumentItem {
  original_text: string | null;
}

export interface UploadDocumentResponse {
  message: string;
  document_id: number | null;
  filename: string | null;
  uploaded_documents: {
    document_id: number;
    filename: string;
  }[];
  uploaded_count: number;
}

export interface Translation {
  translation_id: number;
  document_id: number;
  source_language: string;
  target_language: string;
  translated_text: string;
  translator: string;
  created_at: string;
}

export interface Summary {
  summary_id: number;
  document_id: number;
  summary_text: string;
  keywords: string[];
  created_at: string;
}

export interface TagResponse {
  tags: string[];
}

export interface Note {
  id: number;
  content: string;
  selected_text: string | null;
  page_number: number | null;
  created_at: string;
  updated_at: string;
}

export interface NoteListResponse {
  notes: Note[];
}

export interface ChatMessage {
  chat_message_id: number;
  document_id: number;
  question: string;
  answer: string;
  created_at: string;
}

export interface ChatListResponse {
  messages: ChatMessage[];
}

export interface Recommendation {
  document_id: number;
  title: string | null;
  similarity_score: number;
  reason: string | null;
}

export interface RecommendationResponse {
  base_document_id: number;
  recommendations: Recommendation[];
}

export interface MetadataResponse {
  document_id: number;
  abstract: string;
  tags: string[];
  methods: string[];
  datasets: string[];
  research_field: string | null;
  published_year: number | null;
}

export interface ApiErrorBody {
  detail?: string | Array<unknown>;
}
