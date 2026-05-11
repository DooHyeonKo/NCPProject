import { apiRequest, toJsonBody } from "@/lib/api";
import type {
  ChatListResponse,
  ChatMessage,
  DocumentDetail,
  DocumentListResponse,
  MetadataResponse,
  Note,
  NoteListResponse,
  RecommendationResponse,
  Summary,
  TagResponse,
  Translation,
  UploadDocumentResponse,
} from "@/lib/types";

export async function uploadDocument(file: File, title?: string, isPublic = false) {
  const formData = new FormData();
  formData.append("files", file);

  if (title) {
    formData.append("title", title);
  }

  formData.append("is_public", String(isPublic));

  return apiRequest<UploadDocumentResponse>("/documents", {
    method: "POST",
    body: formData,
  });
}

export async function uploadDocuments(files: File[], title?: string, isPublic = false) {
  const formData = new FormData();
  for (const file of files) {
    formData.append("files", file);
  }

  if (title && files.length === 1) {
    formData.append("title", title);
  }

  formData.append("is_public", String(isPublic));

  return apiRequest<UploadDocumentResponse>("/documents", {
    method: "POST",
    body: formData,
  });
}

export async function getDocuments() {
  const data = await apiRequest<DocumentListResponse>("/documents", {
    method: "GET",
  });

  return data.documents;
}

export async function getDocument(documentId: number) {
  return apiRequest<DocumentDetail>(`/documents/${documentId}`, {
    method: "GET",
  });
}

export async function deleteDocument(documentId: number) {
  return apiRequest<{ message: string }>(`/documents/${documentId}`, {
    method: "DELETE",
  });
}

export async function updateDocumentVisibility(documentId: number, isPublic: boolean) {
  return apiRequest<{ message: string; is_public: boolean }>(
    `/documents/${documentId}/visibility`,
    {
      method: "PATCH",
      body: toJsonBody({ is_public: isPublic }),
    }
  );
}

export async function translateDocument(documentId: number) {
  return apiRequest<Translation>(`/documents/${documentId}/translation`, {
    method: "POST",
    body: toJsonBody({
      source_language: "en",
      target_language: "ko",
    }),
  });
}

export async function getTranslation(documentId: number) {
  return apiRequest<Translation>(`/documents/${documentId}/translation`, {
    method: "GET",
  });
}

export async function summarizeDocument(documentId: number) {
  return apiRequest<Summary>(`/documents/${documentId}/summary`, {
    method: "POST",
  });
}

export async function getSummary(documentId: number) {
  return apiRequest<Summary>(`/documents/${documentId}/summary`, {
    method: "GET",
  });
}

export async function addTags(documentId: number, tags: string[]) {
  const data = await apiRequest<TagResponse>(`/documents/${documentId}/tags`, {
    method: "POST",
    body: toJsonBody({ tags }),
  });

  return data.tags;
}

export async function getTags(documentId: number) {
  const data = await apiRequest<TagResponse>(`/documents/${documentId}/tags`, {
    method: "GET",
  });

  return data.tags;
}

export async function createNote(
  documentId: number,
  content: string,
  selectedText?: string,
  pageNumber?: number
) {
  return apiRequest<Note>(`/documents/${documentId}/notes`, {
    method: "POST",
    body: toJsonBody({
      content,
      selected_text: selectedText,
      page_number: pageNumber,
    }),
  });
}

export async function getNotes(documentId: number) {
  const data = await apiRequest<NoteListResponse>(`/documents/${documentId}/notes`, {
    method: "GET",
  });

  return data.notes;
}

export async function updateNote(noteId: number, content: string) {
  return apiRequest<Note>(`/notes/${noteId}`, {
    method: "PATCH",
    body: toJsonBody({ content }),
  });
}

export async function deleteNote(noteId: number) {
  return apiRequest<{ message: string }>(`/notes/${noteId}`, {
    method: "DELETE",
  });
}

export async function askDocument(documentId: number, question: string) {
  return apiRequest<ChatMessage>(`/documents/${documentId}/chat`, {
    method: "POST",
    body: toJsonBody({ question }),
  });
}

export async function getChatMessages(documentId: number) {
  const data = await apiRequest<ChatListResponse>(`/documents/${documentId}/chat`, {
    method: "GET",
  });

  return data.messages;
}

export async function getRecommendations(documentId: number) {
  const data = await apiRequest<RecommendationResponse>(
    `/documents/${documentId}/recommendations`,
    {
      method: "GET",
    }
  );

  return data.recommendations;
}

export async function translateSelectedText(documentId: number, selectedText: string) {
  return apiRequest<{ translated_text: string }>(`/documents/${documentId}/translation/selected`, {
    method: "POST",
    body: toJsonBody({
      selected_text: selectedText,
      source_language: "en",
      target_language: "ko",
    }),
  });
}

export async function extractDocumentMetadata(documentId: number) {
  return apiRequest<MetadataResponse>(`/documents/${documentId}/metadata`, {
    method: "POST",
  });
}
