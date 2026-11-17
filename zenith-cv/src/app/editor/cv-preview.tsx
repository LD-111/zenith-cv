"use client";

import {
  useEffect,
  useRef,
  useState,
  startTransition,
  isValidElement,
  cloneElement,
  Fragment,
} from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export type PreviewPageSize = "A4" | "LETTER";

const PAGE_MM = {
  A4: { width: 210, height: 297 },
  LETTER: { width: 215.9, height: 279.4 },
} as const;

const PAD_X_MM = 16;
const PAD_Y_MM = 14;

interface BlockSpan {
  top: number;
  bottom: number;
}

interface CvPreviewProps {
  pageSize: PreviewPageSize;
  cssVars: Record<string, string>;
  body: string;
  highlightPattern: RegExp | null;
  onPageCount: (count: number) => void;
}

function highlightNode(node: React.ReactNode, pattern: RegExp | null): React.ReactNode {
  if (!pattern) return node;
  if (typeof node === "string") {
    const parts = node.split(pattern);
    if (parts.length === 1) return node;
    return parts.map((part, i) =>
      i % 2 === 1 ? <mark key={i} className="cv-mark">{part}</mark> : part
    );
  }
  if (Array.isArray(node)) {
    return node.map((child, i) => <Fragment key={i}>{highlightNode(child, pattern)}</Fragment>);
  }
  if (isValidElement<{ children?: React.ReactNode }>(node) && node.props.children != null) {
    return cloneElement(node, undefined, highlightNode(node.props.children, pattern));
  }
  return node;
}

function mmToPx(mm: number): number {
  const probe = document.createElement("div");
  probe.style.cssText = `position:absolute;visibility:hidden;height:${mm}mm;width:0;pointer-events:none;`;
  document.body.appendChild(probe);
  const px = probe.getBoundingClientRect().height;
  probe.remove();
  return px;
}

function packPages(blocks: BlockSpan[], contentHeight: number, totalHeight: number): number[] {
  if (totalHeight <= contentHeight + 1) return [0];
  const offsets: number[] = [];
  let y = 0;
  for (let safety = 0; safety < 40 && y < totalHeight - 1; safety += 1) {
    offsets.push(y);
    let end = y + contentHeight;
    for (const block of blocks) {
      const height = block.bottom - block.top;
      const startsInPage = block.top > y + 0.5 && block.top < end - 0.5;
      const overflows = block.bottom > end + 1;
      if (startsInPage && overflows && height <= contentHeight + 1) {
        end = block.top;
        break;
      }
    }
    if (end <= y + 1) end = Math.min(totalHeight, y + contentHeight);
    y = end;
  }
  return offsets.length > 0 ? offsets : [0];
}

function CvMarkdown({ body, highlightPattern }: { body: string; highlightPattern: RegExp | null }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        h1: ({ children }) => <h1 className="cv-h1">{highlightNode(children, highlightPattern)}</h1>,
        h2: ({ children }) => <h2 className="cv-h2">{highlightNode(children, highlightPattern)}</h2>,
        h3: ({ children }) => <h3 className="cv-h3">{highlightNode(children, highlightPattern)}</h3>,
        p: ({ children }) => <p className="cv-p">{highlightNode(children, highlightPattern)}</p>,
        ul: ({ children }) => <ul className="cv-ul">{children}</ul>,
        ol: ({ children }) => <ol className="cv-ol">{children}</ol>,
        li: ({ children }) => <li className="cv-li">{highlightNode(children, highlightPattern)}</li>,
        strong: ({ children }) => <strong className="cv-strong">{children}</strong>,
        em: ({ children }) => <em className="cv-em">{children}</em>,
        a: ({ href, children }) => (
          <a href={href} className="cv-a" target="_blank" rel="noopener noreferrer">
            {children}
          </a>
        ),
        hr: () => <hr className="cv-hr" />,
        code: ({ children }) => <code className="cv-code">{children}</code>,
        blockquote: ({ children }) => <blockquote className="cv-blockquote">{children}</blockquote>,
        table: ({ children }) => <table className="cv-table">{children}</table>,
        th: ({ children }) => <th className="cv-th">{children}</th>,
        td: ({ children }) => <td className="cv-td">{children}</td>,
      }}
    >
      {body}
    </ReactMarkdown>
  );
}

export function CvPreview({ pageSize, cssVars, body, highlightPattern, onPageCount }: CvPreviewProps) {
  const frameRef = useRef<HTMLDivElement>(null);
  const measurerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [offsets, setOffsets] = useState<number[]>([0]);
  const [pageWidthPx, setPageWidthPx] = useState(0);
  const [pageHeightPx, setPageHeightPx] = useState(0);
  const page = PAGE_MM[pageSize];
  const contentWidthMm = page.width - PAD_X_MM * 2;
  const contentHeightMm = page.height - PAD_Y_MM * 2;
  const themeKey = JSON.stringify(cssVars);
  const highlightKey = highlightPattern ? highlightPattern.source + highlightPattern.flags : "";

  useEffect(() => {
    const frame = frameRef.current;
    const measurer = measurerRef.current;
    if (!frame || !measurer) return;
    let cancelled = false;

    const measure = () => {
      if (cancelled) return;
      const contentHeight = mmToPx(contentHeightMm);
      const widthPx = mmToPx(page.width);
      const heightPx = mmToPx(page.height);
      const frameStyle = getComputedStyle(frame);
      const available = frame.clientWidth
        - (parseFloat(frameStyle.paddingLeft) || 0)
        - (parseFloat(frameStyle.paddingRight) || 0);
      const nextScale = widthPx > 0 && available > 0 ? Math.min(1, available / widthPx) : 1;
      const root = measurer.getBoundingClientRect();
      const blocks: BlockSpan[] = Array.from(measurer.children).map((node) => {
        const el = node as HTMLElement;
        const rect = el.getBoundingClientRect();
        const marginTop = parseFloat(getComputedStyle(el).marginTop) || 0;
        const marginBottom = parseFloat(getComputedStyle(el).marginBottom) || 0;
        return {
          top: Math.max(0, rect.top - root.top - marginTop),
          bottom: rect.bottom - root.top + marginBottom,
        };
      });
      const total = Math.max(measurer.scrollHeight, blocks.length > 0 ? blocks[blocks.length - 1].bottom : 0);
      const nextOffsets = packPages(blocks, contentHeight, total);
      startTransition(() => {
        setScale(nextScale);
        setOffsets(nextOffsets);
        setPageWidthPx(widthPx);
        setPageHeightPx(heightPx);
        onPageCount(nextOffsets.length);
      });
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(frame);
    observer.observe(measurer);
    document.fonts.addEventListener("loadingdone", measure);
    void document.fonts.ready.then(() => measure());
    return () => {
      cancelled = true;
      observer.disconnect();
      document.fonts.removeEventListener("loadingdone", measure);
    };
  }, [body, contentHeightMm, highlightKey, onPageCount, page.height, page.width, themeKey]);

  const ready = pageWidthPx > 0 && pageHeightPx > 0;
  const pageRule = pageSize === "LETTER" ? "letter" : "A4";

  return (
    <div ref={frameRef} className="min-h-0 flex-1 overflow-auto bg-neutral-200 px-6 py-8 print:overflow-visible print:bg-white print:p-0">
      <style>{`@media print { @page { size: ${pageRule} portrait; margin: 0; } }`}</style>
      <div
        ref={measurerRef}
        className="cv-measurer cv-content"
        aria-hidden
        style={{
          ...cssVars,
          position: "fixed",
          left: "-10000px",
          top: 0,
          width: `${contentWidthMm}mm`,
          visibility: "hidden",
          pointerEvents: "none",
        }}
      >
        <CvMarkdown body={body} highlightPattern={highlightPattern} />
      </div>
      <div className="mx-auto flex w-fit flex-col items-center">
        {offsets.map((offset, index) => (
          <div key={index} className="contents">
            <div
              className="cv-sheet-frame relative"
              style={ready ? { width: pageWidthPx * scale, height: pageHeightPx * scale } : { width: `${page.width}mm`, height: `${page.height}mm` }}
            >
              <article
                className={`cv-sheet overflow-hidden bg-white shadow-md ${index === offsets.length - 1 ? "cv-sheet-last" : ""}`}
                aria-hidden={index > 0 ? true : undefined}
                style={{
                  ...cssVars,
                  width: ready ? pageWidthPx : `${page.width}mm`,
                  height: ready ? pageHeightPx : `${page.height}mm`,
                  transform: ready ? `scale(${scale})` : undefined,
                  transformOrigin: "top left",
                  position: ready ? "absolute" : "relative",
                }}
              >
                <div
                  className="cv-sheet-clip overflow-hidden"
                  style={{ height: `${contentHeightMm}mm`, margin: `${PAD_Y_MM}mm ${PAD_X_MM}mm` }}
                >
                  <div className="cv-sheet-flow" style={{ marginTop: -offset }}>
                    <div className="cv-content" style={cssVars}>
                      <CvMarkdown body={body} highlightPattern={highlightPattern} />
                    </div>
                  </div>
                </div>
              </article>
            </div>
            {index < offsets.length - 1 && (
              <p className="cv-page-gap py-3 text-center text-[10px] font-mono text-neutral-400">{index + 1}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
