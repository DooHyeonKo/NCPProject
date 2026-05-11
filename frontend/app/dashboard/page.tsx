"use client";

import Link from "next/link";
import { ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/Logo";
import { SearchIcon, UploadIcon } from "@/components/Icons";
import { logout } from "@/lib/auth";
import {
  deleteDocument,
  getDocuments,
  updateDocumentVisibility,
  uploadDocuments,
} from "@/lib/documents";
import type { DocumentItem } from "@/lib/types";

function prettySize(size: number) {
  if (!size) return "0 KB";
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}

function getProgress(status: string) {
  return status === "TRANSLATED" ? 100 : 45;
}

export default function DashboardPage() {
  const router = useRouter();
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [query, setQuery] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [title, setTitle] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const uploadPanelRef = useRef<HTMLFormElement | null>(null);

  const filteredDocuments = useMemo(() => {
    const q = query.trim().toLowerCase();

    if (!q) return documents;

    return documents.filter((doc) =>
      `${doc.title ?? ""} ${doc.original_filename}`.toLowerCase().includes(q)
    );
  }, [documents, query]);

  async function loadDocuments() {
    setError("");
    setLoading(true);

    try {
      const data = await getDocuments();
      setDocuments(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "문서 목록 조회에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDocuments();
  }, []);

  function onFileChange(event: ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(event.target.files ?? []);
    setFiles(selected);

    if (selected.length === 1 && !title) {
      setTitle(selected[0].name.replace(/\.[^/.]+$/, ""));
      return;
    }

    if (selected.length > 1) {
      setTitle("");
    }
  }

  function openFileDialog() {
    fileInputRef.current?.click();
    uploadPanelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function onUpload(event: FormEvent) {
    event.preventDefault();

    if (uploading) return;

    if (files.length === 0) {
      setError("업로드할 파일을 선택하세요.");
      return;
    }

    setUploading(true);
    setError("");

    try {
      const res = await uploadDocuments(files, title, isPublic);
      setFiles([]);
      setTitle("");
      setIsPublic(true);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      await loadDocuments();
      if (res.uploaded_count === 1 && res.document_id) {
        router.push(`/documents/${res.document_id}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "문서 업로드에 실패했습니다.");
    } finally {
      setUploading(false);
    }
  }

  async function onToggleVisibility(doc: DocumentItem) {
    try {
      await updateDocumentVisibility(doc.id, !doc.is_public);
      await loadDocuments();
    } catch (err) {
      setError(err instanceof Error ? err.message : "공개 여부 변경에 실패했습니다.");
    }
  }

  async function onDelete(doc: DocumentItem) {
    if (!window.confirm(`${doc.title ?? doc.original_filename} 문서를 삭제할까요?`)) return;

    try {
      await deleteDocument(doc.id);
      await loadDocuments();
    } catch (err) {
      setError(err instanceof Error ? err.message : "문서 삭제에 실패했습니다.");
    }
  }

  async function onLogout() {
    await logout();
    router.push("/login");
  }

  return (
    <main className="dashboard">
      <aside className="sidebar">
        <Link href="/" className="brand">
          <Logo size="sm" />
          <span>A to ㄱ</span>
        </Link>

        <button className="button dark" type="button" onClick={openFileDialog}>
          <UploadIcon size={18} />
          문서 업로드
        </button>

        <div className="drop-box">
          백엔드 API와 연결되어 있습니다. PDF, DOCX, TXT 파일을 업로드하면 문서 목록과 상세 화면에 반영됩니다.
        </div>

        <button className="button" onClick={onLogout} type="button">
          로그아웃
        </button>
      </aside>

      <section className="main">
        <div className="toolbar">
          <div>
            <p className="kicker">A to ㄱ Workspace</p>
            <h1>문서 번역 노트</h1>
          </div>
          <div className="search">
            <SearchIcon />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="문서 검색" />
          </div>
        </div>

        <form className="upload-panel" onSubmit={onUpload} ref={uploadPanelRef}>
          <div className="upload-row">
            <input
              ref={fileInputRef}
              className="sr-only"
              type="file"
              multiple
              accept=".pdf,.docx,.txt"
              onChange={onFileChange}
            />
            <button className="file-picker" type="button" onClick={openFileDialog}>
              <UploadIcon size={18} />
              <span>
                {files.length === 0
                  ? "PDF, DOCX, TXT 파일 선택"
                  : files.length === 1
                    ? files[0].name
                    : `${files.length}개 파일 선택됨`}
              </span>
            </button>
            <input
              className="input"
              value={title}
              disabled={files.length > 1}
              onChange={(event) => setTitle(event.target.value)}
              placeholder={files.length > 1 ? "여러 파일 업로드 시 파일명으로 제목이 자동 설정됩니다." : "문서 제목"}
            />
            <label className="visibility-toggle">
              <input type="checkbox" checked={isPublic} onChange={(event) => setIsPublic(event.target.checked)} /> 공개
            </label>
          </div>
          <button className="button primary" style={{ marginTop: 12 }} disabled={uploading}>
            {uploading ? "업로드 중..." : "업로드"}
          </button>
        </form>

        {error && <div className="error">{error}</div>}

        <div className="stats">
          <div className="stat">
            <p className="kicker">Documents</p>
            <strong>{documents.length}</strong>
            <p>업로드 문서</p>
          </div>
          <div className="stat">
            <p className="kicker">Translated</p>
            <strong>{documents.filter((doc) => doc.status === "TRANSLATED").length}</strong>
            <p>번역 완료</p>
          </div>
          <div className="stat">
            <p className="kicker">Public</p>
            <strong>{documents.filter((doc) => doc.is_public).length}</strong>
            <p>추천 후보 문서</p>
          </div>
        </div>

        {loading ? (
          <p>문서 목록을 불러오는 중입니다...</p>
        ) : (
          <div className="doc-grid">
            {filteredDocuments.map((doc, index) => {
              const progress = getProgress(doc.status);

              return (
                <div className="doc-card" key={doc.id}>
                  <div>
                    <div className="badge-row">
                      <span className="badge">{doc.file_type.toUpperCase()}</span>
                      <span className="badge">{doc.status}</span>
                      <span className="badge">{doc.is_public ? "PUBLIC" : "PRIVATE"}</span>
                    </div>
                    <h3>{doc.title || doc.original_filename}</h3>
                    <p>{doc.original_filename}</p>
                    <p>{prettySize(doc.file_size)}</p>
                  </div>

                  <div>
                    <div className="progress-row">
                      <div className="progress-meta">
                        <span>진행률</span>
                        <span>{progress}%</span>
                      </div>
                      <div className="progress">
                        <span style={{ width: `${progress}%` }} />
                      </div>
                    </div>

                    <div className="badge-row" style={{ marginTop: 12 }}>
                      <Link className="button" href={`/documents/${doc.id}`} style={{ height: 36 }}>
                        상세
                      </Link>
                      <button className="button" style={{ height: 36 }} onClick={() => onToggleVisibility(doc)} type="button">
                        {doc.is_public ? "비공개" : "공개"}
                      </button>
                      <button className="button danger" style={{ height: 36 }} onClick={() => onDelete(doc)} type="button">
                        삭제
                      </button>
                    </div>
                    <p style={{ marginTop: 10 }}>#{String(index + 1).padStart(2, "0")} · {doc.created_at.slice(0, 10)}</p>
                  </div>
                </div>
              );
            })}

            {filteredDocuments.length === 0 && (
              <div className="doc-card">
                <h3>문서가 없습니다</h3>
                <p>파일을 업로드하면 여기에 표시됩니다.</p>
              </div>
            )}
          </div>
        )}
      </section>
    </main>
  );
}
