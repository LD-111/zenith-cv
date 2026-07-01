"use client";

import {
  useState,
  useEffect,
  useCallback,
  useRef,
  startTransition,
} from "react";
import { useRouter } from "next/navigation";
import {
  pickDirectory,
  getDirectoryHandle,
  getDirectoryName,
  clearDirectoryHandle,
  scanMdFiles,
  writeMdFile,
  deleteMdFile,
  fileExists,
  sanitizeSlug,
  slugToDisplayName,
  formatFileSize,
  formatDate,
  type MdFile,
} from "@/lib/fs-access";
import { DEFAULT_TEMPLATE, BLANK_TEMPLATE } from "@/lib/templates";

type Phase = "loading" | "connect" | "explorer";

export default function Dashboard() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("loading");
  const [dirName, setDirName] = useState<string | null>(null);
  const [files, setFiles] = useState<MdFile[]>([]);
  const [scanning, setScanning] = useState(false);
  const [connectError, setConnectError] = useState<string | null>(null);

  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newSlug, setNewSlug] = useState("");
  const [slugError, setSlugError] = useState<string | null>(null);
  const [useTemplate, setUseTemplate] = useState(true);
  const [creating, setCreating] = useState(false);

  const createInputRef = useRef<HTMLInputElement>(null);

  const refreshFiles = useCallback(async () => {
    setScanning(true);
    try {
      const result = await scanMdFiles();
      startTransition(() => setFiles(result));
    } catch (err) {
      console.error("Failed to scan directory:", err);
    } finally {
      setScanning(false);
    }
  }, []);

  useEffect(() => {
    startTransition(() => {
      const handle = getDirectoryHandle();
      if (handle) {
        setDirName(getDirectoryName());
        setPhase("explorer");
      } else {
        setPhase("connect");
      }
    });
  }, []);

  useEffect(() => {
    if (phase === "explorer") {
      refreshFiles();
    }
  }, [phase, refreshFiles]);

  useEffect(() => {
    if (showCreateModal) {
      setTimeout(() => createInputRef.current?.focus(), 50);
    }
  }, [showCreateModal]);

  const handleConnect = useCallback(async () => {
    setConnectError(null);
    try {
      await pickDirectory();
      startTransition(() => {
        setDirName(getDirectoryName());
        setPhase("explorer");
      });
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      startTransition(() =>
        setConnectError(
          err instanceof Error ? err.message : "Failed to connect folder."
        )
      );
    }
  }, []);

  const handleDisconnect = useCallback(() => {
    clearDirectoryHandle();
    startTransition(() => {
      setFiles([]);
      setDirName(null);
      setPhase("connect");
    });
  }, []);

  const handleOpenFile = useCallback(
    (slug: string) => {
      router.push("/editor/" + encodeURIComponent(slug));
    },
    [router]
  );

  const handleDelete = useCallback(
    async (fileName: string) => {
      try {
        await deleteMdFile(fileName);
        startTransition(() =>
          setFiles((prev) => prev.filter((f) => f.fileName !== fileName))
        );
      } catch (err) {
        console.error("Failed to delete:", err);
      } finally {
        setDeleteConfirm(null);
      }
    },
    []
  );

  const handleCreate = useCallback(async () => {
    const slug = sanitizeSlug(newSlug);
    if (!slug) {
      startTransition(() => setSlugError("Please enter a valid filename."));
      return;
    }
    const fileName = slug + ".md";
    setCreating(true);
    setSlugError(null);
    try {
      const exists = await fileExists(fileName);
      if (exists) {
        startTransition(() =>
          setSlugError(`"${fileName}" already exists in this folder.`)
        );
        setCreating(false);
        return;
      }
      const content = useTemplate ? DEFAULT_TEMPLATE : BLANK_TEMPLATE;
      await writeMdFile(fileName, content);
      setShowCreateModal(false);
      setNewSlug("");
      router.push("/editor/" + encodeURIComponent(slug));
    } catch (err) {
      console.error("Failed to create file:", err);
      startTransition(() =>
        setSlugError(
          err instanceof Error ? err.message : "Failed to create file."
        )
      );
      setCreating(false);
    }
  }, [newSlug, useTemplate, router]);

  if (phase === "loading") {
    return (
      <div className="flex h-screen items-center justify-center bg-neutral-950">
        <div className="flex items-center gap-3 text-neutral-400">
          <span className="inline-block w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
          <span className="font-mono text-sm tracking-widest uppercase">
            Loading...
          </span>
        </div>
      </div>
    );
  }

  if (phase === "connect") {
    return (
      <div className="flex flex-col min-h-screen bg-neutral-950 text-neutral-100 items-center justify-center px-6">
        <div className="w-full max-w-md text-center">
          <div className="flex items-center justify-center mb-8">
            <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-indigo-600 shadow-lg shadow-indigo-900/50">
              <svg
                width="28"
                height="28"
                viewBox="0 0 24 24"
                fill="none"
                stroke="white"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                <polyline points="9 22 9 12 15 12 15 22" />
              </svg>
            </div>
          </div>

          <h1 className="text-3xl font-bold text-white tracking-tight mb-2">
            Zenith CV
          </h1>
          <p className="text-sm font-mono text-indigo-400 mb-6 tracking-widest uppercase">
            v3 · File System Edition
          </p>

          <p className="text-neutral-400 text-sm leading-relaxed mb-2">
            Your CVs live as real{" "}
            <code className="text-indigo-300 bg-indigo-950/60 px-1 py-0.5 rounded text-xs font-mono">
              .md
            </code>{" "}
            files on your computer — no cloud, no database, no volatility.
          </p>
          <p className="text-neutral-600 text-xs leading-relaxed mb-10">
            Select a local folder (e.g. <code className="font-mono">~/zenith-cv-files</code>) and Zenith CV
            will read and write Markdown files directly inside it.
          </p>

          <button
            onClick={handleConnect}
            className="w-full flex items-center justify-center gap-3 px-6 py-4 text-base font-semibold text-white bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 rounded-xl transition-colors shadow-lg shadow-indigo-900/30"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
            </svg>
            Select Local CV Folder
          </button>

          {connectError && (
            <p className="mt-4 text-xs text-red-400 font-mono">{connectError}</p>
          )}

          <p className="mt-8 text-xs text-neutral-700 font-mono">
            Requires Chrome or Edge · Uses HTML5 File System Access API
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-neutral-950 text-neutral-100">
      <header className="shrink-0 border-b border-neutral-800 bg-neutral-950">
        <div className="mx-auto max-w-6xl px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-indigo-600">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="white"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
                <polyline points="10 9 9 9 8 9" />
              </svg>
            </div>
            <div>
              <span className="text-base font-semibold text-white tracking-tight">
                Zenith CV
              </span>
              <span className="ml-2 text-xs text-neutral-500 font-mono">v3</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-4 py-1.5 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 rounded-md transition-colors"
            >
              <svg
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              New CV
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 mx-auto w-full max-w-6xl px-6 py-10">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xs font-mono font-medium text-neutral-500 uppercase tracking-widest">
              Your resumes
            </h2>
            <div className="mt-1 flex items-center gap-2">
              <div className="flex items-center gap-1.5">
                <svg
                  width="11"
                  height="11"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-emerald-500"
                >
                  <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                </svg>
                <span className="text-xs font-mono text-emerald-600 truncate max-w-[200px]">
                  {dirName}
                </span>
              </div>
              <span className="text-neutral-700 text-xs">·</span>
              <span className="text-xs text-neutral-600">
                {scanning
                  ? "scanning…"
                  : `${files.length} ${files.length === 1 ? "file" : "files"}`}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={refreshFiles}
              disabled={scanning}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-neutral-500 hover:text-white border border-neutral-800 hover:border-neutral-600 rounded-md transition-colors disabled:opacity-40"
            >
              <svg
                width="11"
                height="11"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={scanning ? "animate-spin" : ""}
              >
                <polyline points="23 4 23 10 17 10" />
                <polyline points="1 20 1 14 7 14" />
                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
              </svg>
              Refresh
            </button>
            <button
              onClick={handleDisconnect}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-neutral-500 hover:text-red-400 border border-neutral-800 hover:border-red-900 rounded-md transition-colors"
            >
              <svg
                width="11"
                height="11"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              Disconnect
            </button>
          </div>
        </div>

        {scanning && files.length === 0 ? (
          <div className="flex items-center justify-center py-24">
            <div className="flex items-center gap-3 text-neutral-500">
              <span className="inline-block w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
              <span className="font-mono text-sm">Scanning folder…</span>
            </div>
          </div>
        ) : files.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-16 h-16 rounded-2xl bg-neutral-800 flex items-center justify-center mb-4">
              <svg
                width="28"
                height="28"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-neutral-600"
              >
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
            </div>
            <p className="text-neutral-400 text-sm font-medium">
              No Markdown files found
            </p>
            <p className="text-neutral-600 text-xs mt-1 mb-5">
              This folder has no <code className="font-mono">.md</code> files
              yet.
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-500 rounded-md transition-colors"
            >
              Create New CV
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {files.map((file) => (
              <FileCard
                key={file.fileName}
                file={file}
                confirmingDelete={deleteConfirm === file.fileName}
                onOpen={() => handleOpenFile(file.slug)}
                onDeleteRequest={() =>
                  setDeleteConfirm(
                    deleteConfirm === file.fileName ? null : file.fileName
                  )
                }
                onDeleteConfirm={() => handleDelete(file.fileName)}
                onDeleteCancel={() => setDeleteConfirm(null)}
              />
            ))}
          </div>
        )}
      </main>

      <footer className="shrink-0 border-t border-neutral-900 py-4">
        <p className="text-center text-xs font-mono text-neutral-700">
          ZENITH CV · privacy-first · files live on your machine
        </p>
      </footer>

      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => {
              if (!creating) {
                setShowCreateModal(false);
                setNewSlug("");
                setSlugError(null);
              }
            }}
          />
          <div className="relative w-full max-w-md bg-neutral-900 border border-neutral-700 rounded-xl shadow-2xl p-6">
            <h3 className="text-base font-semibold text-white mb-1">
              New CV File
            </h3>
            <p className="text-sm text-neutral-400 mb-5">
              Choose a filename for your new{" "}
              <code className="font-mono text-indigo-300 text-xs">.md</code>{" "}
              file inside{" "}
              <span className="text-neutral-300 font-medium">{dirName}</span>.
            </p>

            <label className="block text-xs font-mono font-medium text-neutral-400 uppercase tracking-widest mb-1.5">
              Filename
            </label>
            <div className="flex items-center gap-0">
              <input
                ref={createInputRef}
                type="text"
                value={newSlug}
                onChange={(e) => {
                  setNewSlug(e.target.value);
                  setSlugError(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !creating) handleCreate();
                  if (e.key === "Escape") {
                    setShowCreateModal(false);
                    setNewSlug("");
                    setSlugError(null);
                  }
                }}
                placeholder="e.g. software-eng-v1"
                className="flex-1 px-3 py-2 text-sm bg-neutral-800 border border-neutral-600 border-r-0 focus:border-indigo-500 focus:outline-none rounded-l-md text-white placeholder-neutral-600 transition-colors font-mono"
              />
              <span className="px-3 py-2 text-sm bg-neutral-700 border border-neutral-600 rounded-r-md text-neutral-500 font-mono select-none">
                .md
              </span>
            </div>
            {newSlug && sanitizeSlug(newSlug) !== newSlug && (
              <p className="mt-1.5 text-xs text-neutral-500 font-mono">
                Will be saved as:{" "}
                <span className="text-indigo-400">{sanitizeSlug(newSlug)}.md</span>
              </p>
            )}
            {slugError && (
              <p className="mt-1.5 text-xs text-red-400">{slugError}</p>
            )}

            <div className="mt-4 flex items-center gap-3">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <div
                  onClick={() => setUseTemplate((v) => !v)}
                  className={`relative w-9 h-5 rounded-full transition-colors ${
                    useTemplate ? "bg-indigo-600" : "bg-neutral-700"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                      useTemplate ? "translate-x-4" : "translate-x-0"
                    }`}
                  />
                </div>
                <span className="text-xs text-neutral-400">
                  Use engineering template
                </span>
              </label>
            </div>

            <div className="mt-6 flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setNewSlug("");
                  setSlugError(null);
                }}
                disabled={creating}
                className="px-4 py-2 text-sm font-medium text-neutral-400 hover:text-white transition-colors disabled:opacity-40"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={creating || !newSlug.trim()}
                className="px-5 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {creating ? "Creating…" : "Create & Open"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface FileCardProps {
  file: MdFile;
  confirmingDelete: boolean;
  onOpen: () => void;
  onDeleteRequest: () => void;
  onDeleteConfirm: () => void;
  onDeleteCancel: () => void;
}

function FileCard({
  file,
  confirmingDelete,
  onOpen,
  onDeleteRequest,
  onDeleteConfirm,
  onDeleteCancel,
}: FileCardProps) {
  return (
    <div
      className={`group relative flex flex-col bg-neutral-900 border rounded-xl overflow-hidden transition-all duration-150 ${
        confirmingDelete
          ? "border-red-700 shadow-[0_0_0_1px_rgba(185,28,28,0.3)]"
          : "border-neutral-800 hover:border-neutral-600 hover:shadow-lg hover:shadow-black/40"
      }`}
    >
      <button
        onClick={onOpen}
        className="flex flex-col flex-1 text-left p-5 focus:outline-none"
        disabled={confirmingDelete}
      >
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-neutral-800 border border-neutral-700">
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-indigo-400"
            >
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
            </svg>
          </div>
          <span className="opacity-0 group-hover:opacity-100 transition-opacity text-xs font-mono text-indigo-400">
            OPEN →
          </span>
        </div>

        <h3 className="text-sm font-semibold text-white leading-snug mb-0.5 line-clamp-1">
          {slugToDisplayName(file.slug)}
        </h3>
        <p className="text-xs font-mono text-neutral-600 mb-3">
          {file.fileName}
        </p>

        <div className="mt-auto pt-3 border-t border-neutral-800 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <svg
              width="10"
              height="10"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-neutral-600 shrink-0"
            >
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            <span className="font-mono text-xs text-neutral-600">
              {formatDate(file.lastModified)}
            </span>
          </div>
          <span className="font-mono text-xs text-neutral-700">
            {formatFileSize(file.size)}
          </span>
        </div>
      </button>

      <div className="shrink-0 px-5 py-3 border-t border-neutral-800 bg-neutral-900/50">
        {confirmingDelete ? (
          <div className="flex items-center justify-between">
            <span className="text-xs text-red-400 font-medium">
              Delete from disk?
            </span>
            <div className="flex gap-2">
              <button
                onClick={onDeleteCancel}
                className="text-xs text-neutral-400 hover:text-white px-2 py-0.5 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={onDeleteConfirm}
                className="text-xs font-semibold text-white bg-red-700 hover:bg-red-600 px-3 py-0.5 rounded transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={onDeleteRequest}
            className="flex items-center gap-1.5 text-xs text-neutral-600 hover:text-red-400 transition-colors"
          >
            <svg
              width="11"
              height="11"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6l-1 14H6L5 6" />
              <path d="M10 11v6M14 11v6" />
              <path d="M9 6V4h6v2" />
            </svg>
            Delete file
          </button>
        )}
      </div>
    </div>
  );
}
