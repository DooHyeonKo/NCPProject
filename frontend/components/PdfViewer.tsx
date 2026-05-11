"use client";

import type { CSSProperties } from "react";
import { useEffect, useMemo, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { API_BASE_URL } from "@/lib/config";
import { getAccessToken } from "@/lib/tokens";

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
).toString();

type PdfViewerProps = {
  documentId: number;
  highlights?: Array<{
    id: string;
    color: "green" | "blue" | "pink";
    thickness: number;
    rects: Array<{
      page: number;
      left: number;
      top: number;
      width: number;
      height: number;
    }>;
  }>;
  onTextSelect?: (payload: {
    text: string;
    anchor: { x: number; y: number };
    rects: Array<{
      page: number;
      left: number;
      top: number;
      width: number;
      height: number;
    }>;
  }) => void;
};

export function PdfViewer({ documentId, highlights = [], onTextSelect }: PdfViewerProps) {
  const [numPages, setNumPages] = useState(0);
  const [containerWidth, setContainerWidth] = useState(900);

  useEffect(() => {
    const updateWidth = () => {
      const viewportWidth = window.innerWidth;
      if (viewportWidth < 900) {
        setContainerWidth(Math.max(viewportWidth - 120, 260));
        return;
      }

      setContainerWidth(Math.min(920, viewportWidth - 540));
    };

    updateWidth();
    window.addEventListener("resize", updateWidth);
    return () => window.removeEventListener("resize", updateWidth);
  }, []);

  const file = useMemo(() => {
    const token = getAccessToken();
    return {
      url: `${API_BASE_URL}/documents/${documentId}/file`,
      httpHeaders: token ? { Authorization: `Bearer ${token}` } : undefined,
    };
  }, [documentId]);

  function handleMouseUp() {
    const selection = window.getSelection();
    const text = selection?.toString().trim() ?? "";
    if (!text || !selection?.rangeCount) return;

    const range = selection.getRangeAt(0);
    const clientRects = Array.from(range.getClientRects());
    const mappedRects = clientRects
      .map((rect) => {
        const element = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
        const pageSurface = element?.closest("[data-page-number]") as HTMLElement | null;
        if (!pageSurface) return null;
        const pageBounds = pageSurface.getBoundingClientRect();
        return {
          page: Number(pageSurface.dataset.pageNumber),
          left: rect.left - pageBounds.left,
          top: rect.top - pageBounds.top,
          width: rect.width,
          height: rect.height,
        };
      })
      .filter((item): item is NonNullable<typeof item> => Boolean(item));

    const firstRect = clientRects[0];
    if (!firstRect) return;

    onTextSelect?.({
      text,
      anchor: {
        x: firstRect.left + firstRect.width / 2,
        y: firstRect.top - 14,
      },
      rects: mappedRects,
    });
  }

  return (
    <div className="pdf-shell" onMouseUp={handleMouseUp}>
      <Document
        file={file}
        loading={<div className="pdf-status">PDF를 불러오는 중입니다...</div>}
        error={<div className="pdf-status">PDF를 표시하지 못했습니다.</div>}
        onLoadSuccess={({ numPages: totalPages }) => setNumPages(totalPages)}
      >
        <div className="pdf-page-stack">
          {Array.from({ length: numPages }, (_, index) => (
            <div className="pdf-page-card" key={index + 1}>
              <div className="pdf-page-surface" data-page-number={index + 1}>
                <Page
                  pageNumber={index + 1}
                  width={containerWidth}
                  renderAnnotationLayer={false}
                  renderTextLayer
                />
                <div className="pdf-highlight-layer">
                  {highlights.flatMap((highlight) =>
                    highlight.rects
                      .filter((rect) => rect.page === index + 1)
                      .map((rect, rectIndex) => (
                        <div
                          className={`pdf-highlight-rect pdf-highlight-${highlight.color}`}
                          key={`${highlight.id}-${rectIndex}`}
                          style={
                            {
                              left: rect.left,
                              top: rect.top,
                              width: rect.width,
                              height: rect.height,
                              "--underline-thickness": `${highlight.thickness}px`,
                            } as CSSProperties & Record<"--underline-thickness", string>
                          }
                        />
                      ))
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </Document>
    </div>
  );
}
