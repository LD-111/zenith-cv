"use client";

import {
  useState,
  useEffect,
  useCallback,
  useRef,
  startTransition,
} from "react";
import { useParams, useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  getDirectoryHandle,
  readMdFile,
  writeMdFile,
  slugToDisplayName,
} from "@/lib/fs-access";

type SaveStatus = "idle" | "saving" | "saved" | "error";
type LoadState = "loading" | "ready" | "no-workspace" | "not-found" | "error";

export default function EditorPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const slug = decodeURIComponent(params.id);
  const fileName = slug + ".md";
  const displayName = slugToDisplayName(slug);

  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [markdown, setMarkdown] = useState<string>("");
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [loadError, setLoadError] = useState<string | null>(null);

  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isFirstRender = useRef(true);
  const currentMarkdown = useRef<string>("");

  useEffect(() => {
    const dir = getDirectoryHandle();
    if (!dir) {
      startTransition(() => setLoadState("no-workspace"));
      return;
    }

    readMdFile(fileName)
      .then((content) => {
        currentMarkdown.current = content;
        startTransition(() => {
          setMarkdown(content);
          setLoadState("ready");
        });
      })
      .catch((err: unknown) => {
        const msg =
          err instanceof Error ? err.message : String(err);
        if (
          err instanceof DOMException &&
          (err.name === "NotFoundError" || err.name === "TypeMismatchError")
        ) {
          startTransition(() => setLoadState("not-found"));
        } else {
          startTransition(() => {
            setLoadError(msg);
            setLoadState("error");
          });
        }
      });
  }, [fileName]);

  useEffect(() => {
    if (loadState !== "ready") return;
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    currentMarkdown.current = markdown;
    setSaveStatus("saving");
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    if (savedTimerRef.current) clearTimeout(savedTimerRef.current);

    saveTimerRef.current = setTimeout(async () => {
      try {
        await writeMdFile(fileName, markdown);
        setSaveStatus("saved");
        savedTimerRef.current = setTimeout(
          () => setSaveStatus("idle"),
          2500
        );
      } catch (err) {
        console.error("Autosave failed:", err);
        setSaveStatus("error");
      }
    }, 500);

    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [markdown, loadState, fileName]);

  const handleBackToDashboard = useCallback(async () => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
      try {
        await writeMdFile(fileName, currentMarkdown.current);
      } catch {
        // best-effort flush
      }
    }
    router.push("/");
  }, [router, fileName]);

  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  const handleUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        if (typeof ev.target?.result === "string") {
          setMarkdown(ev.target.result);
        }
      };
      reader.readAsText(file);
      e.target.value = "";
    },
    []
  );

  if (loadState === "loading") {
    return (
      <div className="flex h-screen items-center justify-center bg-neutral-950">
        <div className="flex items-center gap-3 text-neutral-400">
          <span className="inline-block w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
          <span className="font-mono text-sm tracking-widest uppercase">
            Loading…
          </span>
        </div>
      </div>
    );
  }

  if (loadState === "no-workspace") {
    return (
      <div className="flex flex-col h-screen items-center justify-center bg-neutral-950 text-neutral-400 gap-4 px-6 text-center">
        <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-neutral-800 mb-2">
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-neutral-500"
          >
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
          </svg>
        </div>
        <p className="font-mono text-sm text-neutral-300">
          Workspace not connected
        </p>
        <p className="text-xs text-neutral-600 max-w-xs">
          The editor requires a connected local folder. Please go back to the
          dashboard and select your CV folder.
        </p>
        <button
          onClick={() => router.push("/")}
          className="mt-2 text-indigo-400 hover:text-indigo-300 text-sm underline underline-offset-4 transition-colors"
        >
          Connect workspace →
        </button>
      </div>
    );
  }

  if (loadState === "not-found") {
    return (
      <div className="flex flex-col h-screen items-center justify-center bg-neutral-950 text-neutral-400 gap-4">
        <p className="font-mono text-sm">
          <code className="text-indigo-400">{fileName}</code> not found.
        </p>
        <button
          onClick={() => router.push("/")}
          className="text-indigo-400 hover:text-indigo-300 text-sm underline underline-offset-4 transition-colors"
        >
          Back to Dashboard
        </button>
      </div>
    );
  }

  if (loadState === "error") {
    return (
      <div className="flex flex-col h-screen items-center justify-center bg-neutral-950 text-neutral-400 gap-4 px-6 text-center">
        <p className="font-mono text-sm text-red-400">Failed to open file</p>
        <p className="text-xs text-neutral-600 max-w-xs">{loadError}</p>
        <button
          onClick={() => router.push("/")}
          className="text-indigo-400 hover:text-indigo-300 text-sm underline underline-offset-4 transition-colors"
        >
          Back to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-neutral-100 print:block print:bg-white">
      <header className="flex items-center justify-between px-4 py-2.5 bg-neutral-950 border-b border-neutral-800 shrink-0 print:hidden">
        <div className="flex items-center gap-3">
          <button
            onClick={handleBackToDashboard}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-sm font-medium text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-md transition-colors"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
            Dashboard
          </button>

          <span className="text-neutral-700 select-none">|</span>

          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center w-6 h-6 rounded-md bg-indigo-600">
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="white"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
            </div>
            <span className="text-sm font-semibold text-white tracking-tight max-w-[200px] truncate">
              {displayName}
            </span>
            <span className="text-xs font-mono text-neutral-600 hidden sm:inline">
              {fileName}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 min-w-[80px] justify-end">
            {saveStatus === "saving" && (
              <span className="flex items-center gap-1.5 text-xs text-neutral-500 font-mono">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-yellow-500 animate-pulse" />
                saving
              </span>
            )}
            {saveStatus === "saved" && (
              <span className="flex items-center gap-1.5 text-xs text-emerald-500 font-mono">
                <svg
                  width="11"
                  height="11"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                saved
              </span>
            )}
            {saveStatus === "error" && (
              <span className="flex items-center gap-1.5 text-xs text-red-400 font-mono">
                <svg
                  width="11"
                  height="11"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                save failed
              </span>
            )}
          </div>

          <label
            htmlFor="md-upload"
            className="cursor-pointer flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-neutral-400 hover:text-white border border-neutral-700 hover:border-neutral-500 rounded-md transition-colors"
          >
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            Load .md
          </label>
          <input
            id="md-upload"
            type="file"
            accept=".md,.txt"
            className="sr-only"
            onChange={handleUpload}
          />

          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-4 py-1.5 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-800 rounded-md transition-colors"
          >
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="6 9 6 2 18 2 18 9" />
              <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
              <rect x="6" y="14" width="12" height="8" />
            </svg>
            Download PDF
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden print:block print:overflow-visible">
        <section className="flex flex-col w-1/2 border-r border-neutral-200 print:hidden">
          <div className="flex items-center gap-2 px-4 py-2 bg-neutral-50 border-b border-neutral-200 shrink-0">
            <div className="flex gap-1.5">
              <span className="w-3 h-3 rounded-full bg-red-400" />
              <span className="w-3 h-3 rounded-full bg-yellow-400" />
              <span className="w-3 h-3 rounded-full bg-green-400" />
            </div>
            <span className="text-xs text-neutral-400 font-mono ml-1">
              {fileName}
            </span>
          </div>
          <textarea
            value={markdown}
            onChange={(e) => setMarkdown(e.target.value)}
            spellCheck={false}
            className="flex-1 w-full resize-none p-5 font-mono text-sm leading-relaxed text-neutral-800 bg-neutral-50 focus:outline-none focus:bg-white transition-colors"
            placeholder="Start writing your resume in Markdown…"
            aria-label="Markdown editor"
          />
        </section>

        <section
          className="flex flex-col w-1/2 overflow-y-auto bg-white print:w-full print:overflow-visible"
          aria-label="CV Preview"
          id="cv-preview"
        >
          <div className="shrink-0 flex items-center justify-between px-4 py-2 bg-white border-b border-neutral-200 print:hidden">
            <span className="text-xs font-medium text-neutral-400 uppercase tracking-widest">
              Preview
            </span>
          </div>

          <div className="flex-1 p-8 print:p-0">
            <article className="cv-content mx-auto max-w-[210mm] min-h-[297mm] bg-white px-[16mm] py-[14mm] shadow-sm print:shadow-none print:max-w-none print:min-h-0 print:px-0 print:py-0">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  h1: ({ children }) => (
                    <h1 className="cv-h1">{children}</h1>
                  ),
                  h2: ({ children }) => (
                    <h2 className="cv-h2">{children}</h2>
                  ),
                  h3: ({ children }) => (
                    <h3 className="cv-h3">{children}</h3>
                  ),
                  p: ({ children }) => <p className="cv-p">{children}</p>,
                  ul: ({ children }) => (
                    <ul className="cv-ul">{children}</ul>
                  ),
                  li: ({ children }) => (
                    <li className="cv-li">{children}</li>
                  ),
                  strong: ({ children }) => (
                    <strong className="cv-strong">{children}</strong>
                  ),
                  em: ({ children }) => (
                    <em className="cv-em">{children}</em>
                  ),
                  a: ({ href, children }) => (
                    <a
                      href={href}
                      className="cv-a"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {children}
                    </a>
                  ),
                  hr: () => <hr className="cv-hr" />,
                  code: ({ children }) => (
                    <code className="cv-code">{children}</code>
                  ),
                  blockquote: ({ children }) => (
                    <blockquote className="cv-blockquote">
                      {children}
                    </blockquote>
                  ),
                  table: ({ children }) => (
                    <table className="cv-table">{children}</table>
                  ),
                  th: ({ children }) => (
                    <th className="cv-th">{children}</th>
                  ),
                  td: ({ children }) => (
                    <td className="cv-td">{children}</td>
                  ),
                }}
              >
                {markdown}
              </ReactMarkdown>
            </article>
          </div>
        </section>
      </div>
    </div>
  );
}
