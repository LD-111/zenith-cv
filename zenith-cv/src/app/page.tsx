"use client";

import { useState, useEffect, useCallback, useRef, startTransition } from "react";
import { useRouter } from "next/navigation";
import {
  loadAllCvs,
  saveCv,
  deleteCv,
  generateId,
  type CvEntry,
} from "@/lib/storage";
import { DEFAULT_TEMPLATE, BLANK_TEMPLATE } from "@/lib/templates";

function formatDate(iso: string): string {
  const d = new Date(iso);
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

function seedDefaultCv(): CvEntry {
  const entry: CvEntry = {
    id: generateId(),
    title: "My First Zenith CV",
    lastModified: new Date().toISOString(),
    markdownContent: DEFAULT_TEMPLATE,
  };
  saveCv(entry);
  return entry;
}

export default function Dashboard() {
  const router = useRouter();
  const [cvs, setCvs] = useState<CvEntry[]>([]);
  const [mounted, setMounted] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [useTemplate, setUseTemplate] = useState(true);
  const createInputRef = useRef<HTMLInputElement>(null);
  const importRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    startTransition(() => {
      let entries = loadAllCvs();
      if (entries.length === 0) {
        entries = [seedDefaultCv()];
      }
      setCvs(entries);
      setMounted(true);
    });
  }, []);

  useEffect(() => {
    if (showCreateModal) {
      setTimeout(() => createInputRef.current?.focus(), 50);
    }
  }, [showCreateModal]);

  const openEditor = useCallback(
    (id: string) => {
      router.push(`/editor/${id}`);
    },
    [router]
  );

  const handleDelete = useCallback(
    (id: string) => {
      deleteCv(id);
      setCvs((prev) => prev.filter((c) => c.id !== id));
      setDeleteConfirm(null);
    },
    []
  );

  const handleCreate = useCallback(() => {
    const title = newTitle.trim() || "Untitled CV";
    const entry: CvEntry = {
      id: generateId(),
      title,
      lastModified: new Date().toISOString(),
      markdownContent: useTemplate ? BLANK_TEMPLATE : "",
    };
    saveCv(entry);
    setCvs((prev) => [entry, ...prev]);
    setShowCreateModal(false);
    setNewTitle("");
    router.push(`/editor/${entry.id}`);
  }, [newTitle, useTemplate, router]);

  const handleImport = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const rawName = file.name.replace(/\.(md|txt)$/i, "");
      const title = rawName.replace(/[-_]/g, " ").trim() || "Imported CV";
      const reader = new FileReader();
      reader.onload = (ev) => {
        if (typeof ev.target?.result !== "string") return;
        const entry: CvEntry = {
          id: generateId(),
          title,
          lastModified: new Date().toISOString(),
          markdownContent: ev.target.result,
        };
        saveCv(entry);
        setCvs((prev) => [entry, ...prev]);
      };
      reader.readAsText(file);
      e.target.value = "";
    },
    []
  );

  if (!mounted) {
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

  return (
    <div className="flex flex-col min-h-screen bg-neutral-950 text-neutral-100">
      {/* Top Nav */}
      <header className="shrink-0 border-b border-neutral-800 bg-neutral-950">
        <div className="mx-auto max-w-6xl px-6 py-4 flex items-center justify-between">
          {/* Brand */}
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
              <span className="ml-2 text-xs text-neutral-500 font-mono">
                v2
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <label
              htmlFor="import-md"
              className="cursor-pointer flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-neutral-300 hover:text-white border border-neutral-700 hover:border-neutral-500 rounded-md transition-colors"
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
              Import .md
            </label>
            <input
              id="import-md"
              ref={importRef}
              type="file"
              accept=".md,.txt"
              className="sr-only"
              onChange={handleImport}
            />

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

      {/* Main content */}
      <main className="flex-1 mx-auto w-full max-w-6xl px-6 py-10">
        {/* Section header */}
        <div className="mb-6 flex items-baseline justify-between">
          <div>
            <h2 className="text-xs font-mono font-medium text-neutral-500 uppercase tracking-widest">
              Your resumes
            </h2>
            <p className="mt-1 text-sm text-neutral-600">
              {cvs.length} {cvs.length === 1 ? "document" : "documents"} stored locally
            </p>
          </div>
          <span className="text-xs font-mono text-neutral-700">
            ZENITH://LOCAL
          </span>
        </div>

        {/* CV Grid */}
        {cvs.length === 0 ? (
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
              No resumes yet
            </p>
            <p className="text-neutral-600 text-xs mt-1">
              Create your first CV or import a Markdown file to get started.
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="mt-5 px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-500 rounded-md transition-colors"
            >
              Create New CV
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {cvs.map((cv) => (
              <CvCard
                key={cv.id}
                cv={cv}
                confirmingDelete={deleteConfirm === cv.id}
                onOpen={() => openEditor(cv.id)}
                onDeleteRequest={() =>
                  setDeleteConfirm(deleteConfirm === cv.id ? null : cv.id)
                }
                onDeleteConfirm={() => handleDelete(cv.id)}
                onDeleteCancel={() => setDeleteConfirm(null)}
              />
            ))}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="shrink-0 border-t border-neutral-900 py-4">
        <p className="text-center text-xs font-mono text-neutral-700">
          ZENITH CV — privacy-first · all data stored locally in your browser
        </p>
      </footer>

      {/* Create CV Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => {
              setShowCreateModal(false);
              setNewTitle("");
            }}
          />
          <div className="relative w-full max-w-md bg-neutral-900 border border-neutral-700 rounded-xl shadow-2xl p-6">
            <h3 className="text-base font-semibold text-white mb-1">
              New CV
            </h3>
            <p className="text-sm text-neutral-400 mb-5">
              Give your resume a name to identify it in the dashboard.
            </p>

            <label className="block text-xs font-mono font-medium text-neutral-400 uppercase tracking-widest mb-1.5">
              Title
            </label>
            <input
              ref={createInputRef}
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCreate();
                if (e.key === "Escape") {
                  setShowCreateModal(false);
                  setNewTitle("");
                }
              }}
              placeholder="e.g. Senior Engineer — Google 2026"
              className="w-full px-3 py-2 text-sm bg-neutral-800 border border-neutral-600 focus:border-indigo-500 focus:outline-none rounded-md text-white placeholder-neutral-600 transition-colors"
            />

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
                  Start from blank template
                </span>
              </label>
            </div>

            <div className="mt-6 flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setNewTitle("");
                }}
                className="px-4 py-2 text-sm font-medium text-neutral-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                className="px-5 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-md transition-colors"
              >
                Create & Open
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface CvCardProps {
  cv: CvEntry;
  confirmingDelete: boolean;
  onOpen: () => void;
  onDeleteRequest: () => void;
  onDeleteConfirm: () => void;
  onDeleteCancel: () => void;
}

function CvCard({
  cv,
  confirmingDelete,
  onOpen,
  onDeleteRequest,
  onDeleteConfirm,
  onDeleteCancel,
}: CvCardProps) {
  const preview = cv.markdownContent
    .split("\n")
    .filter((l) => l.trim() && !l.startsWith("#") && !l.startsWith("---"))
    .slice(0, 2)
    .join(" ")
    .slice(0, 90);

  return (
    <div
      className={`group relative flex flex-col bg-neutral-900 border rounded-xl overflow-hidden transition-all duration-150 ${
        confirmingDelete
          ? "border-red-700 shadow-[0_0_0_1px_rgba(185,28,28,0.3)]"
          : "border-neutral-800 hover:border-neutral-600 hover:shadow-lg hover:shadow-black/40"
      }`}
    >
      {/* Card clickable body */}
      <button
        onClick={onOpen}
        className="flex flex-col flex-1 text-left p-5 focus:outline-none"
        disabled={confirmingDelete}
      >
        {/* Doc icon row */}
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
          {/* Open indicator — appears on hover */}
          <span className="opacity-0 group-hover:opacity-100 transition-opacity text-xs font-mono text-indigo-400">
            OPEN →
          </span>
        </div>

        {/* Title */}
        <h3 className="text-sm font-semibold text-white leading-snug mb-1 line-clamp-2">
          {cv.title}
        </h3>

        {/* Preview snippet */}
        {preview && (
          <p className="text-xs text-neutral-600 leading-relaxed line-clamp-2 mb-3">
            {preview}
          </p>
        )}

        {/* Last modified */}
        <div className="mt-auto pt-3 border-t border-neutral-800 flex items-center gap-1.5">
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
            {formatDate(cv.lastModified)}
          </span>
        </div>
      </button>

      {/* Delete zone */}
      <div className="shrink-0 px-5 py-3 border-t border-neutral-800 bg-neutral-900/50">
        {confirmingDelete ? (
          <div className="flex items-center justify-between">
            <span className="text-xs text-red-400 font-medium">
              Delete permanently?
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
            Delete
          </button>
        )}
      </div>
    </div>
  );
}
