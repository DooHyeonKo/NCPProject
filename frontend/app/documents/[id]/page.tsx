"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { CSSProperties, FormEvent, MouseEvent as ReactMouseEvent, useEffect, useMemo, useRef, useState } from "react";
import { Logo } from "@/components/Logo";
import { SendIcon } from "@/components/Icons";
import { RichMessage } from "@/components/RichMessage";
import {
  askDocument,
  createNote,
  extractDocumentMetadata,
  getChatMessages,
  getDocument,
  getNotes,
  getRecommendations,
  getSummary,
  getTags,
  getTranslation,
  summarizeDocument,
  translateDocument,
  translateSelectedText,
} from "@/lib/documents";
import type {
  ChatMessage,
  DocumentDetail,
  MetadataResponse,
  Note,
  Recommendation,
  Summary,
  Translation,
} from "@/lib/types";

type UnderlineColor = "green" | "blue" | "pink";
type UnderlineThickness = 3 | 5 | 7;
type PdfHighlightRect = {
  page: number;
  left: number;
  top: number;
  width: number;
  height: number;
};
type PdfHighlight = {
  id: string;
  color: UnderlineColor;
  thickness: UnderlineThickness;
  rects: PdfHighlightRect[];
};

const underlineClass: Record<UnderlineColor, string> = {
  green: "underline-green",
  blue: "underline-blue",
  pink: "underline-pink",
};

const PdfViewer = dynamic(
  () => import("@/components/PdfViewer").then((module) => module.PdfViewer),
  { ssr: false }
);

const SELECTED_CONTEXT_PREFIX = "[SELECTED_CONTEXT]";
const SELECTED_CONTEXT_SUFFIX = "[/SELECTED_CONTEXT]";

function getId(value: string | string[] | undefined) {
  const raw = Array.isArray(value) ? value[0] : value;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

export default function DocumentReaderPage() {
  const params = useParams();
  const router = useRouter();
  const documentId = getId(params.id);

  const [document, setDocument] = useState<DocumentDetail | null>(null);
  const [translation, setTranslation] = useState<Translation | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [paperInfo, setPaperInfo] = useState<MetadataResponse | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [selectedText, setSelectedText] = useState("");
  const [underlineColor, setUnderlineColor] = useState<UnderlineColor>("green");
  const [underlineThickness, setUnderlineThickness] = useState<UnderlineThickness>(5);
  const [selectedTranslation, setSelectedTranslation] = useState("");
  const [selectionTooltip, setSelectionTooltip] = useState<{ x: number; y: number } | null>(null);
  const [isDraggingTooltip, setIsDraggingTooltip] = useState(false);
  const [pdfHighlights, setPdfHighlights] = useState<PdfHighlight[]>([]);
  const [activeHighlightId, setActiveHighlightId] = useState<string | null>(null);
  const [showNoteEditor, setShowNoteEditor] = useState(false);
  const [question, setQuestion] = useState("");
  const [selectedQuestion, setSelectedQuestion] = useState("");
  const [noteContent, setNoteContent] = useState("");
  const [error, setError] = useState("");
  const [loadingAction, setLoadingAction] = useState("");
  const [showRecommendations, setShowRecommendations] = useState(false);
  const [showTranslationPanel, setShowTranslationPanel] = useState(false);
  const [pendingQuestion, setPendingQuestion] = useState("");
  const [rightSidebarWidth, setRightSidebarWidth] = useState(340);
  const [isResizingRightSidebar, setIsResizingRightSidebar] = useState(false);
  const dragOffsetRef = useRef({ x: 0, y: 0 });
  const sidebarResizeRef = useRef({ startX: 0, startWidth: 340 });

  const originalText = useMemo(() => {
    return document?.original_text?.trim() ||
      "문서 원문이 비어 있습니다. 백엔드의 문서 상세 API에서 original_text가 추출되어야 여기에 표시됩니다.";
  }, [document]);

  const isPdfDocument = document?.file_type?.toLowerCase() === "pdf";

  const displayTags = useMemo(() => {
    const source = paperInfo?.tags?.length ? paperInfo.tags : tags;
    return source.filter((tag) => {
      const normalized = tag.trim().toLowerCase();
      return normalized && normalized !== "**핵심 키워드**" && normalized !== "핵심 키워드";
    });
  }, [paperInfo, tags]);

  const displayKeywords = useMemo(() => {
    return (summary?.keywords ?? []).filter((keyword) => {
      const normalized = keyword.trim().toLowerCase();
      return normalized && normalized !== "**핵심 키워드**" && normalized !== "핵심 키워드";
    });
  }, [summary]);

  async function loadAll() {
    if (!documentId) return;

    setError("");

    try {
      const doc = await getDocument(documentId);
      setDocument(doc);
    } catch (err) {
      setError(err instanceof Error ? err.message : "문서 상세 조회에 실패했습니다.");
      return;
    }

    await Promise.allSettled([
      getTranslation(documentId).then(setTranslation),
      getSummary(documentId).then(setSummary),
      getNotes(documentId).then(setNotes),
      getChatMessages(documentId).then(setChatMessages),
      getTags(documentId).then(setTags),
    ]);
  }

  async function loadRecommendations() {
    if (!documentId) return;

    try {
      const data = await getRecommendations(documentId);
      setRecommendations(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "추천 문서 조회에 실패했습니다.");
    }
  }

  async function onLoadPaperInfo() {
    if (!documentId) return;

    setLoadingAction("metadata");
    setError("");

    try {
      const data = await extractDocumentMetadata(documentId);
      setPaperInfo(data);
      setTags(data.tags);
    } catch (err) {
      setError(err instanceof Error ? err.message : "논문 정보 추출에 실패했습니다.");
    } finally {
      setLoadingAction("");
    }
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [documentId]);

  useEffect(() => {
    if (showRecommendations && recommendations.length === 0) {
      loadRecommendations();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showRecommendations]);

  useEffect(() => {
    if (!isDraggingTooltip) return;

    function handleMouseMove(event: MouseEvent) {
      setSelectionTooltip((prev) => {
        if (!prev) return prev;
        return {
          x: event.clientX - dragOffsetRef.current.x,
          y: event.clientY - dragOffsetRef.current.y,
        };
      });
    }

    function handleMouseUp() {
      setIsDraggingTooltip(false);
    }

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDraggingTooltip]);

  useEffect(() => {
    if (!isResizingRightSidebar) return;

    function handleMouseMove(event: MouseEvent) {
      const deltaX = sidebarResizeRef.current.startX - event.clientX;
      const nextWidth = Math.max(280, Math.min(560, sidebarResizeRef.current.startWidth + deltaX));
      setRightSidebarWidth(nextWidth);
    }

    function handleMouseUp() {
      setIsResizingRightSidebar(false);
    }

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    window.document.body.style.cursor = "col-resize";
    window.document.body.style.userSelect = "none";

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      window.document.body.style.cursor = "";
      window.document.body.style.userSelect = "";
    };
  }, [isResizingRightSidebar]);

  function onStartRightSidebarResize(event: ReactMouseEvent<HTMLDivElement>) {
    sidebarResizeRef.current = {
      startX: event.clientX,
      startWidth: rightSidebarWidth,
    };
    setIsResizingRightSidebar(true);
  }

  function setCurrentUnderlineColor(color: UnderlineColor) {
    setUnderlineColor(color);
    if (!activeHighlightId) return;
    setPdfHighlights((prev) =>
      prev.map((highlight) =>
        highlight.id === activeHighlightId ? { ...highlight, color } : highlight
      )
    );
  }

  function setCurrentUnderlineThickness(thickness: UnderlineThickness) {
    setUnderlineThickness(thickness);
    if (!activeHighlightId) return;
    setPdfHighlights((prev) =>
      prev.map((highlight) =>
        highlight.id === activeHighlightId ? { ...highlight, thickness } : highlight
      )
    );
  }

  function removeActiveHighlight() {
    if (!activeHighlightId) return;
    setPdfHighlights((prev) => prev.filter((highlight) => highlight.id !== activeHighlightId));
    setActiveHighlightId(null);
    setSelectedText("");
    setSelectedTranslation("");
    setSelectionTooltip(null);
    setShowNoteEditor(false);
    setNoteContent("");
  }

  function captureSelection() {
    const selection = window.getSelection();
    const text = selection?.toString().trim() ?? "";

    if (!text) {
      setSelectionTooltip(null);
      setActiveHighlightId(null);
      return;
    }

    const range = selection?.rangeCount ? selection.getRangeAt(0) : null;
    const rect = range?.getBoundingClientRect();

    setSelectedText(text);
    setSelectedTranslation("");
    setShowNoteEditor(false);
    setError("");
    if (rect) {
      setSelectionTooltip({
        x: rect.left + rect.width / 2,
        y: rect.top - 14,
      });
    }
  }

  function capturePdfSelection(payload: {
    text: string;
    anchor: { x: number; y: number };
    rects: PdfHighlightRect[];
  }) {
    if (!payload.text || payload.rects.length === 0) {
      setSelectionTooltip(null);
      setActiveHighlightId(null);
      return;
    }

    const highlightId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    setSelectedText(payload.text);
    setSelectedTranslation("");
    setSelectedQuestion("");
    setShowNoteEditor(false);
    setError("");
    setSelectionTooltip(payload.anchor);
    setActiveHighlightId(highlightId);
    setPdfHighlights((prev) => [
      ...prev,
      {
        id: highlightId,
        color: underlineColor,
        thickness: underlineThickness,
        rects: payload.rects,
      },
    ]);
  }

  function onStartTooltipDrag(event: ReactMouseEvent<HTMLDivElement>) {
    if (!selectionTooltip) return;
    const target = event.target as HTMLElement;
    if (target.closest("button, textarea, input, a, .selection-message, .selection-scroll")) {
      return;
    }
    dragOffsetRef.current = {
      x: event.clientX - selectionTooltip.x,
      y: event.clientY - selectionTooltip.y,
    };
    setIsDraggingTooltip(true);
  }

  async function onTranslateDocument() {
    if (!documentId) return;

    setLoadingAction("translate");
    setError("");

    try {
      const data = await translateDocument(documentId);
      setTranslation(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "번역 생성에 실패했습니다.");
    } finally {
      setLoadingAction("");
    }
  }

  async function onOpenTranslationPanel() {
    setShowTranslationPanel(true);
    if (!translation && loadingAction !== "translate") {
      await onTranslateDocument();
    }
  }

  async function onTranslateSelected() {
    if (!documentId) return;

    if (!selectedText) {
      setError("밑줄 번역할 텍스트를 먼저 선택하세요.");
      return;
    }

    setLoadingAction("selected");
    setError("");

    try {
      const data = await translateSelectedText(documentId, selectedText);
      setSelectedTranslation(data.translated_text);
    } catch (err) {
      setError(err instanceof Error ? err.message : "선택 영역 번역에 실패했습니다.");
    } finally {
      setLoadingAction("");
    }
  }

  async function onSummarize() {
    if (!documentId) return;

    setLoadingAction("summary");
    setError("");

    try {
      const data = await summarizeDocument(documentId);
      setSummary(data);
      setTags((data.keywords ?? []).filter((keyword) => !keyword.includes("핵심 키워드")));
      await onLoadPaperInfo();
    } catch (err) {
      setError(err instanceof Error ? err.message : "요약 생성에 실패했습니다.");
    } finally {
      setLoadingAction("");
    }
  }

  async function onAsk(event: FormEvent) {
    event.preventDefault();

    if (!documentId || !question.trim()) return;

    const nextQuestion = question.trim();

    setLoadingAction("chat");
    setError("");
    setPendingQuestion(nextQuestion);

    try {
      const data = await askDocument(documentId, nextQuestion);
      setChatMessages((prev) => [...prev, data]);
      setQuestion("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "AI 질문에 실패했습니다.");
    } finally {
      setPendingQuestion("");
      setLoadingAction("");
    }
  }

  async function onAskSelectedText() {
    if (!documentId) return;

    if (!selectedText.trim()) {
      setError("선택한 텍스트가 없습니다.");
      return;
    }

    if (!selectedQuestion.trim()) {
      setError("질문을 입력하세요.");
      return;
    }

    const visibleQuestion = selectedQuestion.trim();
    const payloadQuestion = [
      SELECTED_CONTEXT_PREFIX,
      selectedText.slice(0, 3000),
      SELECTED_CONTEXT_SUFFIX,
      visibleQuestion,
    ].join("\n");

    setLoadingAction("selected-chat");
    setError("");
    setPendingQuestion(visibleQuestion);

    try {
      const data = await askDocument(documentId, payloadQuestion);
      setChatMessages((prev) => [...prev, { ...data, question: visibleQuestion }]);
      setSelectedQuestion("");
      setSelectionTooltip(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "선택 영역 질문에 실패했습니다.");
    } finally {
      setPendingQuestion("");
      setLoadingAction("");
    }
  }

  async function onSaveNote() {
    if (!documentId) return;

    const content = noteContent.trim() || "밑줄 친 부분 메모";

    if (!selectedText && !noteContent.trim()) {
      setError("저장할 선택 텍스트나 노트 내용이 없습니다.");
      return;
    }

    setLoadingAction("note");
    setError("");

    try {
      const note = await createNote(documentId, content, selectedText || undefined, 1);
      setNotes((prev) => [note, ...prev]);
      setNoteContent("");
      setShowNoteEditor(false);
      setSelectionTooltip(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "노트 저장에 실패했습니다.");
    } finally {
      setLoadingAction("");
    }
  }

  if (!documentId) {
    return <main className="page"><div className="container">문서 ID가 올바르지 않습니다.</div></main>;
  }

  return (
    <main
      className={`reader ${showRecommendations ? "related-open" : ""} ${
        showTranslationPanel ? "translation-open" : ""
      }`}
      style={{ "--right-sidebar-width": `${rightSidebarWidth}px` } as CSSProperties}
    >
      <aside className="rail">
        <Link href="/dashboard">
          <Logo size="sm" />
        </Link>
      </aside>

      <section className="reader-main">
        <header className="reader-header">
          <div>
            <p className="kicker">Document Reader</p>
            <h1>{document?.title || document?.original_filename || "문서 상세"}</h1>
          </div>
          <div className="header-actions">
            <button className="button primary" type="button" onClick={onOpenTranslationPanel}>
              전체 번역
            </button>
            <button className="button" type="button" onClick={() => setShowRecommendations((prev) => !prev)}>
              {showRecommendations ? "추천 닫기" : "유사 문서"}
            </button>
            <Link href="/dashboard" className="button">목록</Link>
          </div>
        </header>

        <div className="paper-area">
          {error && <div className="error">{error}</div>}
          {selectionTooltip && selectedText && (
            <div
              className="selection-tooltip"
              style={{
                left: selectionTooltip.x,
                top: selectionTooltip.y,
              }}
            >
              <div className="selection-tooltip-arrow" />
              <div className="selection-tooltip-body" onMouseDown={onStartTooltipDrag}>
                <div className="selection-tooltip-header">
                      <span>선택 도구</span>
                      <span className="selection-tooltip-drag">드래그해서 이동</span>
                </div>
                <div className={`selection-message user ${underlineClass[underlineColor]}`}>
                  <div className="selection-scroll">
                    {selectedText}
                  </div>
                </div>

                <div className="selection-tooltip-controls">
                  <div className="color-row">
                    <button className="color-btn" onClick={() => setCurrentUnderlineColor("green")} type="button">초록</button>
                    <button className="color-btn" onClick={() => setCurrentUnderlineColor("blue")} type="button">파랑</button>
                    <button className="color-btn" onClick={() => setCurrentUnderlineColor("pink")} type="button">핑크</button>
                  </div>
                  <div className="color-row">
                    <button className="color-btn" onClick={() => setCurrentUnderlineThickness(3)} type="button">얇게</button>
                    <button className="color-btn" onClick={() => setCurrentUnderlineThickness(5)} type="button">보통</button>
                    <button className="color-btn" onClick={() => setCurrentUnderlineThickness(7)} type="button">굵게</button>
                  </div>
                  <div className="action-row">
                    <button className="button primary" onClick={onTranslateSelected} disabled={loadingAction === "selected"} type="button">
                      {loadingAction === "selected" ? "처리 중..." : "선택 번역"}
                    </button>
                    <button className="button" onClick={() => setShowNoteEditor((prev) => !prev)} type="button">
                      {showNoteEditor ? "메모 접기" : "메모"}
                    </button>
                    <button
                      className="button danger"
                      disabled={!activeHighlightId}
                      onClick={removeActiveHighlight}
                      type="button"
                    >
                      밑줄 제거
                    </button>
                    <button
                      className="button"
                      onClick={() => {
                        setSelectedText("");
                        setSelectedTranslation("");
                        setSelectionTooltip(null);
                        setActiveHighlightId(null);
                      }}
                      type="button"
                    >
                      닫기
                    </button>
                  </div>
                </div>

                {(loadingAction === "selected" || selectedTranslation) && (
                  <div className="selection-message ai">
                    <div className="selection-scroll">
                      {loadingAction === "selected"
                        ? "선택한 문장을 번역하는 중입니다..."
                        : selectedTranslation}
                    </div>
                  </div>
                )}

                <div className="tooltip-ask-wrap">
                  <textarea
                    className="input tooltip-note-input"
                    value={selectedQuestion}
                    onChange={(event) => setSelectedQuestion(event.target.value)}
                    placeholder="선택한 부분에 대해 AI에게 질문하기"
                  />
                  <button
                    className="button dark"
                    onClick={onAskSelectedText}
                    disabled={loadingAction === "selected-chat"}
                    type="button"
                  >
                    {loadingAction === "selected-chat" ? "질문 중..." : "선택 영역 질문"}
                  </button>
                </div>

                {showNoteEditor && (
                  <div className="tooltip-note-wrap">
                    <textarea
                      className="input tooltip-note-input"
                      value={noteContent}
                      onChange={(event) => setNoteContent(event.target.value)}
                      placeholder="선택 부분에 대한 메모를 남기세요."
                    />
                    <button
                      className="button dark"
                      onClick={onSaveNote}
                      disabled={loadingAction === "note"}
                      type="button"
                    >
                      {loadingAction === "note" ? "저장 중..." : "노트 저장"}
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className={`paper-layout ${isPdfDocument ? "paper-layout-pdf" : ""}`}>
            <article className="paper-box">
              <p className="kicker">Original</p>
              <h2>원문</h2>
              {isPdfDocument && documentId ? (
                <PdfViewer
                  documentId={documentId}
                  highlights={pdfHighlights}
                  onTextSelect={capturePdfSelection}
                />
              ) : (
                <div className="paper-scroll">
                  <pre className={`paper-text paper-pre ${underlineClass[underlineColor]}`} onMouseUp={captureSelection}>
                    {originalText}
                  </pre>
                </div>
              )}
            </article>
          </div>

          <div className="paper-box" style={{ marginTop: 14 }}>
            <p className="kicker">Summary</p>
            <h2>요약 · 키워드</h2>
            {summary ? (
              <>
                <p className="paper-text">{summary.summary_text}</p>
                <div className="badge-row" style={{ marginTop: 14 }}>
                  {displayKeywords.map((keyword) => <span className="badge" key={keyword}>{keyword}</span>)}
                </div>
              </>
            ) : (
              <p className="paper-text">요약 생성 전입니다.</p>
            )}
          </div>
        </div>
      </section>

      {showTranslationPanel && (
        <aside className="translation-panel">
          <div className="panel-card panel-card-translation">
            <div className="panel-card-head">
              <div>
                <p className="kicker">Translation</p>
                <h3>전체 번역 결과</h3>
              </div>
              <button className="button" type="button" onClick={() => setShowTranslationPanel(false)}>
                닫기
              </button>
            </div>

            {loadingAction === "translate" ? (
              <div className="translation-status">문서 전체를 번역하는 중입니다...</div>
            ) : translation ? (
              <div className="paper-scroll translation-scroll">
                <pre className="paper-text paper-pre">{translation.translated_text}</pre>
              </div>
            ) : (
              <div className="translation-status">
                아직 번역 결과가 없습니다. 버튼을 누르면 문서 전체 번역을 생성합니다.
              </div>
            )}
          </div>
        </aside>
      )}

      {showRecommendations && (
        <aside className="related-panel">
          <div className="panel-card">
            <p className="kicker">Recommend</p>
            <h3>유사 문서</h3>
            {recommendations.length > 0 ? (
              <div className="recommendation-list">
                {recommendations.map((item) => (
                  <button
                    className="recommendation-card"
                    key={item.document_id}
                    type="button"
                    onClick={() => router.push(`/documents/${item.document_id}`)}
                  >
                    <strong>{item.title ?? `문서 #${item.document_id}`}</strong>
                    <span>유사도 {(item.similarity_score * 100).toFixed(1)}%</span>
                    <p>{item.reason}</p>
                  </button>
                ))}
              </div>
            ) : (
              <p className="selected-text">추천 결과가 없습니다. 공개 문서가 2개 이상 필요할 수 있습니다.</p>
            )}
          </div>

          <div className="panel-card">
            <p className="kicker">Notes</p>
            <h3>개인 노트</h3>
            {notes.length > 0 ? (
              notes.map((note) => (
                <div className="chat-message" key={note.id}>
                  <strong>{note.content}</strong>
                  {note.selected_text && <p>{note.selected_text}</p>}
                </div>
              ))
            ) : (
              <p className="selected-text">아직 저장한 노트가 없습니다.</p>
            )}
          </div>
        </aside>
      )}

      <aside className="selection-panel">
        <div
          className="sidebar-resize-handle"
          onMouseDown={onStartRightSidebarResize}
          role="separator"
          aria-orientation="vertical"
          aria-label="오른쪽 사이드바 너비 조절"
          tabIndex={-1}
        />
        <div className="panel-card">
          <p className="kicker">Paper Profile</p>
          <h3>논문 정보</h3>
          <div className="action-row">
            <button className="button primary" onClick={onTranslateDocument} disabled={loadingAction === "translate"}>
              문서 번역
            </button>
            <button className="button" onClick={onSummarize} disabled={loadingAction === "summary"}>
              요약
            </button>
            <button className="button" onClick={onLoadPaperInfo} disabled={loadingAction === "metadata"}>
              {loadingAction === "metadata" ? "추출 중..." : "정보 추출"}
            </button>
          </div>

          <p className="label">태그</p>
          <div className="badge-row">
            {displayTags.map((tag) => <span className="badge" key={tag}>{tag}</span>)}
          </div>
          <div className="paper-meta-grid">
            <div className="paper-meta-item">
              <span>연구 분야</span>
              <strong>{paperInfo?.research_field ?? "추출 전"}</strong>
            </div>
            <div className="paper-meta-item">
              <span>발행 연도</span>
              <strong>{paperInfo?.published_year ?? "-"}</strong>
            </div>
            <div className="paper-meta-item paper-meta-item-wide">
              <span>방법론</span>
              <strong>{paperInfo?.methods?.join(", ") || "추출 전"}</strong>
            </div>
            <div className="paper-meta-item paper-meta-item-wide">
              <span>데이터셋</span>
              <strong>{paperInfo?.datasets?.join(", ") || "추출 전"}</strong>
            </div>
            <div className="paper-meta-item paper-meta-item-wide">
              <span>초록</span>
              <strong>{paperInfo?.abstract ?? "추출 전"}</strong>
            </div>
          </div>
        </div>

        <div className="panel-card panel-card-chat">
          <p className="kicker">AI Chat</p>
          <h3>문서 질문</h3>

          <div className="chat-list">
            {chatMessages.map((message) => (
              <div className="chat-pair" key={message.chat_message_id}>
                <div className="chat-message user">{message.question}</div>
                <div className="chat-message ai">
                  <RichMessage content={message.answer} />
                </div>
              </div>
            ))}
            {pendingQuestion && (
              <div className="chat-pair" key="pending-chat">
                <div className="chat-message user">{pendingQuestion}</div>
                <div className="chat-message ai chat-message-typing">
                  <span className="typing-dots" aria-hidden="true">
                    <span />
                    <span />
                    <span />
                  </span>
                  <span>AI가 답변을 작성 중입니다...</span>
                </div>
              </div>
            )}
          </div>

          <form onSubmit={onAsk} style={{ marginTop: 12 }}>
            <textarea className="input" value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="이 문서의 핵심 내용이 뭐야?" />
            <button className="button dark" style={{ width: "100%", marginTop: 10 }} disabled={loadingAction === "chat"}>
              <SendIcon /> 질문하기
            </button>
          </form>
        </div>
      </aside>
    </main>
  );
}
