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
  readMdFile,
  writeMdFile,
  deleteMdFile,
  renameMdFile,
  fileExists,
  sanitizeSlug,
  slugToDisplayName,
  allocateCopySlug,
  formatFileSize,
  formatDate,
  type MdFile,
} from "@/lib/fs-access";
import { isFsSupported } from "@/lib/use-fs-support";
import {
  createVirtualCV,
  deleteVirtualCV,
  listVirtualCVs,
  updateVirtualCVName,
  type VirtualCV,
} from "@/lib/virtual-store";
import {
  DEFAULT_TEMPLATE,
  BLANK_TEMPLATE,
  DEMO_TEMPLATE_PM,
} from "@/lib/templates";

type Phase = "loading" | "connect" | "explorer" | "sandbox";
type TemplateChoice = "blank" | "engineering" | "pm";

export default function Dashboard() {
  const router = useRouter();

  const [phase, setPhase] = useState<Phase>("loading");
  const [fsSupported, setFsSupported] = useState(false);

  const [dirName, setDirName] = useState<string | null>(null);
  const [files, setFiles] = useState<MdFile[]>([]);
  const [scanning, setScanning] = useState(false);
  const [connectError, setConnectError] = useState<string | null>(null);

  const [virtualFiles, setVirtualFiles] = useState<VirtualCV[]>([]);

  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newName, setNewName] = useState("");
  const [nameError, setNameError] = useState<string | null>(null);
  const [templateChoice, setTemplateChoice] = useState<TemplateChoice>("engineering");
  const [creating, setCreating] = useState(false);

  const [query, setQuery] = useState("");
  const [renameTarget, setRenameTarget] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [renameError, setRenameError] = useState<string | null>(null);

  const uploadRef = useRef<HTMLInputElement>(null);
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

  const refreshVirtualFiles = useCallback(() => {
    startTransition(() => setVirtualFiles(listVirtualCVs()));
  }, []);

  useEffect(() => {
    const supported = isFsSupported();
    startTransition(() => setFsSupported(supported));
    if (!supported) {
      startTransition(() => setPhase("sandbox"));
      return;
    }
    const handle = getDirectoryHandle();
    startTransition(() => {
      if (handle) {
        setDirName(getDirectoryName());
        setPhase("explorer");
      } else {
        setPhase("connect");
      }
    });
  }, []);

  useEffect(() => {
    if (phase === "explorer") refreshFiles();
  }, [phase, refreshFiles]);

  useEffect(() => {
    if (phase === "sandbox") refreshVirtualFiles();
  }, [phase, refreshVirtualFiles]);

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

  const handleOpenVirtual = useCallback(
    (id: string) => {
      router.push("/editor/" + encodeURIComponent(id));
    },
    [router]
  );

  const handleDuplicateLocal = useCallback(async (file: MdFile) => {
    try {
      const content = await readMdFile(file.fileName);
      const taken = new Set<string>();
      let slug = allocateCopySlug(file.slug, (s) => taken.has(s));
      for (let i = 0; i < 20 && await fileExists(slug + ".md"); i++) {
        taken.add(slug);
        slug = allocateCopySlug(file.slug, (s) => taken.has(s));
      }
      await writeMdFile(slug + ".md", content);
      router.push("/editor/" + encodeURIComponent(slug));
    } catch (err) {
      console.error("Failed to duplicate:", err);
    }
  }, [router]);

  const handleDuplicateVirtual = useCallback((cv: VirtualCV) => {
    const taken = new Set(listVirtualCVs().map((item) => item.name));
    const slug = allocateCopySlug(cv.name, (s) => taken.has(s));
    const copy = createVirtualCV(slug, cv.content);
    router.push("/editor/" + encodeURIComponent(copy.id));
  }, [router]);

  const handleDeleteLocal = useCallback(async (fileName: string) => {
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
  }, []);

  const handleDeleteVirtual = useCallback(
    (id: string) => {
      deleteVirtualCV(id);
      setDeleteConfirm(null);
      refreshVirtualFiles();
    },
    [refreshVirtualFiles]
  );

  const handleRenameLocal = useCallback(async () => {
    if (!renameTarget) return;
    const newSlug = sanitizeSlug(renameValue);
    if (!newSlug) {
      setRenameError("Please enter a valid filename.");
      return;
    }
    const newFileName = newSlug + ".md";
    setRenameError(null);
    try {
      const exists = await fileExists(newFileName);
      if (exists && newFileName !== renameTarget) {
        setRenameError(`"${newFileName}" already exists in this folder.`);
        return;
      }
      await renameMdFile(renameTarget, newFileName);
      setRenameTarget(null);
      setRenameValue("");
      startTransition(() => refreshFiles());
    } catch (err) {
      console.error("Failed to rename file:", err);
      setRenameError(err instanceof Error ? err.message : "Failed to rename file.");
    }
  }, [renameTarget, renameValue, refreshFiles]);

  const handleRenameVirtual = useCallback(() => {
    if (!renameTarget) return;
    const newSlug = sanitizeSlug(renameValue);
    if (!newSlug) {
      setRenameError("Please enter a valid name.");
      return;
    }
    setRenameError(null);
    try {
      updateVirtualCVName(renameTarget, newSlug);
      setRenameTarget(null);
      setRenameValue("");
      startTransition(() => refreshVirtualFiles());
    } catch (err) {
      console.error("Failed to rename CV:", err);
      setRenameError(err instanceof Error ? err.message : "Failed to rename CV.");
    }
  }, [renameTarget, renameValue, refreshVirtualFiles]);

  const templateContent = useCallback(
    (choice: TemplateChoice): string => {
      if (choice === "engineering") return DEFAULT_TEMPLATE;
      if (choice === "pm") return DEMO_TEMPLATE_PM;
      return BLANK_TEMPLATE;
    },
    []
  );

  const handleCreateLocal = useCallback(async () => {
    const slug = sanitizeSlug(newName);
    if (!slug) {
      startTransition(() => setNameError("Please enter a valid filename."));
      return;
    }
    const fileName = slug + ".md";
    setCreating(true);
    setNameError(null);
    try {
      const exists = await fileExists(fileName);
      if (exists) {
        startTransition(() =>
          setNameError(`"${fileName}" already exists in this folder.`)
        );
        setCreating(false);
        return;
      }
      await writeMdFile(fileName, templateContent(templateChoice));
      setShowCreateModal(false);
      setNewName("");
      router.push("/editor/" + encodeURIComponent(slug));
    } catch (err) {
      console.error("Failed to create file:", err);
      startTransition(() =>
        setNameError(err instanceof Error ? err.message : "Failed to create file.")
      );
      setCreating(false);
    }
  }, [newName, templateChoice, templateContent, router]);

  const handleCreateVirtual = useCallback(() => {
    const slug = sanitizeSlug(newName);
    if (!slug) {
      startTransition(() => setNameError("Please enter a valid name."));
      return;
    }
    setCreating(true);
    setNameError(null);
    const cv = createVirtualCV(slug, templateContent(templateChoice));
    setShowCreateModal(false);
    setNewName("");
    setCreating(false);
    router.push("/editor/" + encodeURIComponent(cv.id));
  }, [newName, templateChoice, templateContent, router]);

  const handleCreate = phase === "sandbox" ? handleCreateVirtual : handleCreateLocal;

  const handleUploadMd = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const rawName = sanitizeSlug(file.name.replace(/\.md$/i, "").replace(/\.txt$/i, "")) || "my-resume";
      const reader = new FileReader();
      reader.onload = (ev) => {
        if (typeof ev.target?.result === "string") {
          const cv = createVirtualCV(rawName, ev.target.result);
          router.push("/editor/" + encodeURIComponent(cv.id));
        }
      };
      reader.readAsText(file);
      e.target.value = "";
    },
    [router]
  );

  const handleLoadDemo = useCallback(
    (variant: "engineering" | "pm") => {
      const name = variant === "engineering" ? "demo-software-engineer" : "demo-product-manager";
      const content = variant === "engineering" ? DEFAULT_TEMPLATE : DEMO_TEMPLATE_PM;
      const cv = createVirtualCV(name, content);
      router.push("/editor/" + encodeURIComponent(cv.id));
    },
    [router]
  );

  const closeModal = useCallback(() => {
    if (!creating) {
      setShowCreateModal(false);
      setNewName("");
      setNameError(null);
    }
  }, [creating]);

  const q = query.trim().toLowerCase();
  const matches = (name: string, fileName: string) =>
    !q || name.toLowerCase().includes(q) || fileName.toLowerCase().includes(q) || slugToDisplayName(name).toLowerCase().includes(q);
  const visibleFiles = files.filter((file) => matches(file.slug, file.fileName));
  const visibleVirtual = virtualFiles.filter((cv) => matches(cv.name, cv.fileName));

  if (phase === "loading") {
    return (
      <div className="flex h-screen items-center justify-center bg-neutral-950">
        <div className="flex items-center gap-3 text-neutral-400">
          <span className="inline-block w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
          <span className="font-mono text-sm tracking-widest uppercase">Loading...</span>
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
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                <polyline points="9 22 9 12 15 12 15 22" />
              </svg>
            </div>
          </div>

          <h1 className="text-3xl font-bold text-white tracking-tight mb-2">Zenith CV</h1>
          <p className="text-sm font-mono text-indigo-400 mb-6 tracking-widest uppercase">
            v4 · Hybrid File Edition
          </p>

          <p className="text-neutral-400 text-sm leading-relaxed mb-2">
            Your CVs live as real{" "}
            <code className="text-indigo-300 bg-indigo-950/60 px-1 py-0.5 rounded text-xs font-mono">.md</code>{" "}
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
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
            </svg>
            Connect Local CV Folder
          </button>

          {connectError && (
            <p className="mt-4 text-xs text-red-400 font-mono">{connectError}</p>
          )}

          <div className="mt-6 border-t border-neutral-800 pt-6">
            <p className="text-xs text-neutral-600 mb-3">
              Or continue without a folder
            </p>
            <button
              onClick={() => startTransition(() => setPhase("sandbox"))}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium text-neutral-400 hover:text-white border border-neutral-800 hover:border-neutral-600 rounded-xl transition-colors"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                <line x1="8" y1="21" x2="16" y2="21" />
                <line x1="12" y1="17" x2="12" y2="21" />
              </svg>
              Continue in Web Sandbox Mode
            </button>
          </div>

          <p className="mt-6 text-xs text-neutral-700 font-mono">
            Local Mode · Chrome / Edge · File System Access API
          </p>
        </div>
      </div>
    );
  }

  if (phase === "sandbox") {
    return (
      <div className="flex flex-col min-h-screen bg-neutral-950 text-neutral-100">
        <header className="shrink-0 border-b border-neutral-800 bg-neutral-950">
          <div className="mx-auto max-w-6xl px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-indigo-600">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                </svg>
              </div>
              <div>
                <span className="text-base font-semibold text-white tracking-tight">Zenith CV</span>
                <span className="ml-2 text-xs text-neutral-500 font-mono">v4</span>
              </div>
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-950/60 border border-amber-800/50 text-xs font-mono text-amber-400">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block" />
                Web Sandbox Mode
              </span>
            </div>

            <div className="flex items-center gap-2">
              {fsSupported && (
                <button
                  onClick={() => startTransition(() => setPhase("connect"))}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-neutral-400 hover:text-emerald-400 border border-neutral-800 hover:border-emerald-900 rounded-md transition-colors"
                >
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                  </svg>
                  Connect Folder
                </button>
              )}
              <button
                onClick={() => setShowCreateModal(true)}
                className="flex items-center gap-2 px-4 py-1.5 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 rounded-md transition-colors"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                New CV
              </button>
            </div>
          </div>
        </header>

        <div className="mx-auto w-full max-w-6xl px-6 pt-6">
          <div className="flex items-start gap-3 p-4 rounded-xl border border-amber-900/40 bg-amber-950/20">
            <svg className="shrink-0 mt-0.5 text-amber-500" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <p className="text-xs text-amber-300/80 leading-relaxed">
              <span className="font-semibold text-amber-300">Web Sandbox Mode</span> — CVs are stored in session memory only and will be lost on page refresh.
              {" "}Use <span className="font-semibold">Download .md</span> in the editor to keep the source, or <span className="font-semibold">Download PDF</span> for a copy.
              {fsSupported && (
                <span>
                  {" "}Your browser supports Local File Mode —{" "}
                  <button onClick={() => startTransition(() => setPhase("connect"))} className="underline underline-offset-2 hover:text-amber-200 transition-colors">
                    connect a folder
                  </button>
                  {" "}for persistent storage.
                </span>
              )}
            </p>
          </div>
        </div>

        <main className="flex-1 mx-auto w-full max-w-6xl px-6 py-8">
          {virtualFiles.length > 0 ? (
            <>
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <h2 className="text-xs font-mono font-medium text-neutral-500 uppercase tracking-widest">
                    Your CVs
                  </h2>
                  <p className="mt-0.5 text-xs text-neutral-700">
                    {virtualFiles.length} {virtualFiles.length === 1 ? "CV" : "CVs"} in session memory
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="search"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Filter by name"
                    aria-label="Filter CVs"
                    className="w-36 px-2.5 py-1.5 text-xs bg-neutral-900 border border-neutral-800 focus:border-neutral-600 focus:outline-none rounded-md text-neutral-200 placeholder-neutral-600"
                  />
                  <label
                    htmlFor="sandbox-upload"
                    className="cursor-pointer flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-neutral-400 hover:text-white border border-neutral-800 hover:border-neutral-600 rounded-md transition-colors"
                  >
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="17 8 12 3 7 8" />
                      <line x1="12" y1="3" x2="12" y2="15" />
                    </svg>
                    Upload .md
                  </label>
                  <input ref={uploadRef} id="sandbox-upload" type="file" accept=".md,.txt" className="sr-only" onChange={handleUploadMd} />
                </div>
              </div>

              {visibleVirtual.length === 0 ? (
                <p className="mb-10 text-sm text-neutral-500">No CVs match “{query.trim()}”.</p>
              ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-10">
                {visibleVirtual.map((cv) => (
                  <VirtualFileCard
                    key={cv.id}
                    cv={cv}
                    confirmingDelete={deleteConfirm === cv.id}
                    isRenaming={renameTarget === cv.id}
                    renameValue={renameTarget === cv.id ? renameValue : ""}
                    renameError={renameTarget === cv.id ? renameError : null}
                    onOpen={() => handleOpenVirtual(cv.id)}
                    onDeleteRequest={() =>
                      setDeleteConfirm(deleteConfirm === cv.id ? null : cv.id)
                    }
                    onDeleteConfirm={() => handleDeleteVirtual(cv.id)}
                    onDeleteCancel={() => setDeleteConfirm(null)}
                    onRenameStart={() => {
                      setRenameTarget(cv.id);
                      setRenameValue(cv.name);
                      setRenameError(null);
                    }}
                    onRenameChange={setRenameValue}
                    onRenameConfirm={handleRenameVirtual}
                    onRenameCancel={() => {
                      setRenameTarget(null);
                      setRenameValue("");
                      setRenameError(null);
                    }}
                    onDuplicate={() => handleDuplicateVirtual(cv)}
                  />
                ))}
              </div>
              )}

              <div className="border-t border-neutral-900 pt-8">
                <h3 className="text-xs font-mono font-medium text-neutral-600 uppercase tracking-widest mb-4">
                  Demo Templates
                </h3>
                <DemoTemplateRow onLoad={handleLoadDemo} />
              </div>
            </>
          ) : (
            <>
              <div className="mb-8">
                <h2 className="text-xs font-mono font-medium text-neutral-500 uppercase tracking-widest mb-5">
                  Get Started
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
                  <button
                    onClick={() => setShowCreateModal(true)}
                    className="group flex flex-col items-start gap-3 p-5 border border-neutral-800 hover:border-indigo-700 bg-neutral-900/40 hover:bg-indigo-950/30 rounded-xl transition-all text-left"
                  >
                    <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-indigo-600/20 group-hover:bg-indigo-600/30 transition-colors">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-indigo-400">
                        <line x1="12" y1="5" x2="12" y2="19" />
                        <line x1="5" y1="12" x2="19" y2="12" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">Create New CV</p>
                      <p className="text-xs text-neutral-500 mt-0.5">Start from a template or blank slate</p>
                    </div>
                  </button>

                  <label
                    htmlFor="sandbox-upload-empty"
                    className="group cursor-pointer flex flex-col items-start gap-3 p-5 border border-neutral-800 hover:border-neutral-600 bg-neutral-900/40 hover:bg-neutral-800/40 rounded-xl transition-all text-left"
                  >
                    <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-neutral-700/30 group-hover:bg-neutral-600/30 transition-colors">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-neutral-400">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="17 8 12 3 7 8" />
                        <line x1="12" y1="3" x2="12" y2="15" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">Upload .md File</p>
                      <p className="text-xs text-neutral-500 mt-0.5">Import an existing Markdown resume</p>
                    </div>
                  </label>
                  <input id="sandbox-upload-empty" type="file" accept=".md,.txt" className="sr-only" onChange={handleUploadMd} />
                </div>
              </div>

              <div>
                <h3 className="text-xs font-mono font-medium text-neutral-600 uppercase tracking-widest mb-4">
                  Demo Templates — Click to Preview & Edit
                </h3>
                <DemoTemplateRow onLoad={handleLoadDemo} />
              </div>
            </>
          )}
        </main>

        <footer className="shrink-0 border-t border-neutral-900 py-4">
          <p className="text-center text-xs font-mono text-neutral-700">
            ZENITH CV · privacy-first · no data leaves your browser
          </p>
        </footer>

        {showCreateModal && (
          <CreateModal
            mode="sandbox"
            value={newName}
            onChange={(v) => { setNewName(v); setNameError(null); }}
            onSubmit={handleCreate}
            onClose={closeModal}
            error={nameError}
            creating={creating}
            templateChoice={templateChoice}
            onTemplateChange={setTemplateChoice}
            dirName={null}
          />
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-neutral-950 text-neutral-100">
      <header className="shrink-0 border-b border-neutral-800 bg-neutral-950">
        <div className="mx-auto max-w-6xl px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-indigo-600">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
                <polyline points="10 9 9 9 8 9" />
              </svg>
            </div>
            <div>
              <span className="text-base font-semibold text-white tracking-tight">Zenith CV</span>
              <span className="ml-2 text-xs text-neutral-500 font-mono">v4</span>
            </div>
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-950/60 border border-emerald-800/50 text-xs font-mono text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse inline-block" />
              Local File Mode
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-4 py-1.5 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 rounded-md transition-colors"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
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
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-500">
                  <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                </svg>
                <span className="text-xs font-mono text-emerald-600 truncate max-w-[200px]">{dirName}</span>
              </div>
              <span className="text-neutral-700 text-xs">·</span>
              <span className="text-xs text-neutral-600">
                {scanning ? "scanning…" : `${files.length} ${files.length === 1 ? "file" : "files"}`}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Filter by name"
              aria-label="Filter resumes"
              className="w-36 px-2.5 py-1.5 text-xs bg-neutral-900 border border-neutral-800 focus:border-neutral-600 focus:outline-none rounded-md text-neutral-200 placeholder-neutral-600"
            />
            <button
              onClick={refreshFiles}
              disabled={scanning}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-neutral-500 hover:text-white border border-neutral-800 hover:border-neutral-600 rounded-md transition-colors disabled:opacity-40"
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={scanning ? "animate-spin" : ""}>
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
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-neutral-600">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
            </div>
            <p className="text-neutral-400 text-sm font-medium">No Markdown files found</p>
            <p className="text-neutral-600 text-xs mt-1 mb-5">
              This folder has no <code className="font-mono">.md</code> files yet.
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-500 rounded-md transition-colors"
            >
              Create New CV
            </button>
          </div>
        ) : visibleFiles.length === 0 ? (
          <p className="py-16 text-center text-sm text-neutral-500">No resumes match “{query.trim()}”.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {visibleFiles.map((file) => (
              <FileCard
                key={file.fileName}
                file={file}
                confirmingDelete={deleteConfirm === file.fileName}
                isRenaming={renameTarget === file.fileName}
                renameValue={renameTarget === file.fileName ? renameValue : ""}
                renameError={renameTarget === file.fileName ? renameError : null}
                onOpen={() => handleOpenFile(file.slug)}
                onDeleteRequest={() =>
                  setDeleteConfirm(deleteConfirm === file.fileName ? null : file.fileName)
                }
                onDeleteConfirm={() => handleDeleteLocal(file.fileName)}
                onDeleteCancel={() => setDeleteConfirm(null)}
                onRenameStart={() => {
                  setRenameTarget(file.fileName);
                  setRenameValue(file.slug);
                  setRenameError(null);
                }}
                onRenameChange={setRenameValue}
                onRenameConfirm={handleRenameLocal}
                onRenameCancel={() => {
                  setRenameTarget(null);
                  setRenameValue("");
                  setRenameError(null);
                }}
                onDuplicate={() => handleDuplicateLocal(file)}
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
        <CreateModal
          mode="local"
          value={newName}
          onChange={(v) => { setNewName(v); setNameError(null); }}
          onSubmit={handleCreate}
          onClose={closeModal}
          error={nameError}
          creating={creating}
          templateChoice={templateChoice}
          onTemplateChange={setTemplateChoice}
          dirName={dirName}
        />
      )}
    </div>
  );
}

interface CreateModalProps {
  mode: "local" | "sandbox";
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  onClose: () => void;
  error: string | null;
  creating: boolean;
  templateChoice: TemplateChoice;
  onTemplateChange: (t: TemplateChoice) => void;
  dirName: string | null;
}

function CreateModal({
  mode,
  value,
  onChange,
  onSubmit,
  onClose,
  error,
  creating,
  templateChoice,
  onTemplateChange,
  dirName,
}: CreateModalProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 50);
  }, []);

  const slug = sanitizeSlug(value);

  const templates: { key: TemplateChoice; label: string; desc: string }[] = [
    { key: "engineering", label: "Software Engineer", desc: "Senior SWE with distributed systems experience" },
    { key: "pm", label: "Product Manager", desc: "Senior PM with B2B SaaS background" },
    { key: "blank", label: "Blank", desc: "Empty document, start from scratch" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-neutral-900 border border-neutral-700 rounded-xl shadow-2xl p-6">
        <h3 className="text-base font-semibold text-white mb-1">New CV</h3>
        <p className="text-sm text-neutral-400 mb-5">
          {mode === "local" && dirName ? (
            <>
              Saved as a <code className="font-mono text-indigo-300 text-xs">.md</code> file inside{" "}
              <span className="text-neutral-300 font-medium">{dirName}</span>.
            </>
          ) : (
            "Stored in session memory — export PDF to save your work."
          )}
        </p>

        <label className="block text-xs font-mono font-medium text-neutral-400 uppercase tracking-widest mb-1.5">
          {mode === "local" ? "Filename" : "CV Name"}
        </label>
        <div className="flex items-center gap-0">
          <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !creating) onSubmit();
              if (e.key === "Escape") onClose();
            }}
            placeholder={mode === "local" ? "e.g. software-eng-v1" : "e.g. my-resume"}
            className="flex-1 px-3 py-2 text-sm bg-neutral-800 border border-neutral-600 border-r-0 focus:border-indigo-500 focus:outline-none rounded-l-md text-white placeholder-neutral-600 transition-colors font-mono"
          />
          <span className="px-3 py-2 text-sm bg-neutral-700 border border-neutral-600 rounded-r-md text-neutral-500 font-mono select-none">.md</span>
        </div>
        {value && slug !== value && (
          <p className="mt-1.5 text-xs text-neutral-500 font-mono">
            Will be saved as: <span className="text-indigo-400">{slug}.md</span>
          </p>
        )}
        {error && <p className="mt-1.5 text-xs text-red-400">{error}</p>}

        <div className="mt-5">
          <p className="text-xs font-mono font-medium text-neutral-400 uppercase tracking-widest mb-2.5">Template</p>
          <div className="flex flex-col gap-2">
            {templates.map((t) => (
              <label
                key={t.key}
                className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                  templateChoice === t.key
                    ? "border-indigo-600 bg-indigo-950/30"
                    : "border-neutral-700 hover:border-neutral-600 bg-neutral-800/30"
                }`}
              >
                <input
                  type="radio"
                  name="template"
                  value={t.key}
                  checked={templateChoice === t.key}
                  onChange={() => onTemplateChange(t.key)}
                  className="sr-only"
                />
                <span className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                  templateChoice === t.key ? "border-indigo-500 bg-indigo-500" : "border-neutral-600"
                }`}>
                  {templateChoice === t.key && <span className="w-1.5 h-1.5 rounded-full bg-white inline-block" />}
                </span>
                <div>
                  <p className="text-sm font-medium text-white">{t.label}</p>
                  <p className="text-xs text-neutral-500">{t.desc}</p>
                </div>
              </label>
            ))}
          </div>
        </div>

        <div className="mt-6 flex gap-3 justify-end">
          <button
            onClick={onClose}
            disabled={creating}
            className="px-4 py-2 text-sm font-medium text-neutral-400 hover:text-white transition-colors disabled:opacity-40"
          >
            Cancel
          </button>
          <button
            onClick={onSubmit}
            disabled={creating || !value.trim()}
            className="px-5 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {creating ? "Creating…" : "Create & Open"}
          </button>
        </div>
      </div>
    </div>
  );
}

interface DemoTemplateRowProps {
  onLoad: (variant: "engineering" | "pm") => void;
}

function DemoTemplateRow({ onLoad }: DemoTemplateRowProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <button
        onClick={() => onLoad("engineering")}
        className="group flex flex-col items-start gap-2 p-5 border border-neutral-800 hover:border-indigo-700 bg-neutral-900/40 hover:bg-indigo-950/20 rounded-xl transition-all text-left"
      >
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 rounded text-xs font-mono bg-indigo-950/60 text-indigo-400 border border-indigo-900/60">Demo</span>
          <span className="text-sm font-semibold text-white">Software Engineer</span>
        </div>
        <p className="text-xs text-neutral-500">Senior SWE · distributed systems · Go, TypeScript, Rust</p>
        <p className="text-xs text-indigo-400 group-hover:text-indigo-300 transition-colors mt-1">Open in editor →</p>
      </button>

      <button
        onClick={() => onLoad("pm")}
        className="group flex flex-col items-start gap-2 p-5 border border-neutral-800 hover:border-violet-700 bg-neutral-900/40 hover:bg-violet-950/20 rounded-xl transition-all text-left"
      >
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 rounded text-xs font-mono bg-violet-950/60 text-violet-400 border border-violet-900/60">Demo</span>
          <span className="text-sm font-semibold text-white">Product Manager</span>
        </div>
        <p className="text-xs text-neutral-500">Senior PM · B2B SaaS · OKRs, roadmapping, analytics</p>
        <p className="text-xs text-violet-400 group-hover:text-violet-300 transition-colors mt-1">Open in editor →</p>
      </button>
    </div>
  );
}

interface FileCardProps {
  file: MdFile;
  confirmingDelete: boolean;
  isRenaming: boolean;
  renameValue: string;
  renameError: string | null;
  onOpen: () => void;
  onDeleteRequest: () => void;
  onDeleteConfirm: () => void;
  onDeleteCancel: () => void;
  onRenameStart: () => void;
  onRenameChange: (value: string) => void;
  onRenameConfirm: () => void;
  onRenameCancel: () => void;
  onDuplicate: () => void;
}

function FileCard({
  file,
  confirmingDelete,
  isRenaming,
  renameValue,
  renameError,
  onOpen,
  onDeleteRequest,
  onDeleteConfirm,
  onDeleteCancel,
  onRenameStart,
  onRenameChange,
  onRenameConfirm,
  onRenameCancel,
  onDuplicate,
}: FileCardProps) {
  const renameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isRenaming) {
      setTimeout(() => renameInputRef.current?.focus(), 50);
      renameInputRef.current?.select();
    }
  }, [isRenaming]);

  return (
    <div className="group relative flex flex-col gap-3 p-4 rounded-xl border border-neutral-800 hover:border-neutral-700 bg-neutral-900/40 hover:bg-neutral-900/80 transition-all">
      <button onClick={onOpen} className="text-left flex-1" disabled={isRenaming || confirmingDelete}>
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="shrink-0 flex items-center justify-center w-7 h-7 rounded-md bg-indigo-950/60 border border-indigo-900/40">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-indigo-400">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
            </div>
            <p className="text-sm font-semibold text-white truncate">
              {slugToDisplayName(file.slug)}
            </p>
          </div>
        </div>
        <p className="mt-2 text-xs font-mono text-neutral-600">{file.fileName}</p>
        <div className="mt-2.5 flex items-center gap-2 text-xs text-neutral-700">
          <span>{formatDate(file.lastModified)}</span>
          <span>·</span>
          <span>{formatFileSize(file.size)}</span>
        </div>
      </button>

      {isRenaming ? (
        <div className="flex flex-col gap-2 pt-2 border-t border-neutral-800">
          <div className="flex gap-0">
            <input
              ref={renameInputRef}
              type="text"
              value={renameValue}
              onChange={(e) => onRenameChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") onRenameConfirm();
                if (e.key === "Escape") onRenameCancel();
              }}
              placeholder="e.g. new-filename"
              className="flex-1 px-2 py-1 text-xs bg-neutral-800 border border-neutral-600 border-r-0 focus:border-indigo-500 focus:outline-none rounded-l text-white placeholder-neutral-600 transition-colors font-mono"
            />
            <span className="px-2 py-1 text-xs bg-neutral-700 border border-neutral-600 rounded-r text-neutral-500 font-mono select-none">.md</span>
          </div>
          {renameError && <p className="text-xs text-red-400">{renameError}</p>}
          <div className="flex items-center gap-2 pt-1">
            <button onClick={onRenameConfirm} className="px-2.5 py-1 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-500 rounded transition-colors">
              Rename
            </button>
            <button onClick={onRenameCancel} className="px-2.5 py-1 text-xs text-neutral-500 hover:text-white transition-colors">
              Cancel
            </button>
          </div>
        </div>
      ) : confirmingDelete ? (
        <div className="flex items-center gap-2 pt-2 border-t border-neutral-800">
          <span className="text-xs text-red-400 flex-1">Delete from disk?</span>
          <button onClick={onDeleteConfirm} className="px-2.5 py-1 text-xs font-medium text-white bg-red-700 hover:bg-red-600 rounded transition-colors">Confirm</button>
          <button onClick={onDeleteCancel} className="px-2.5 py-1 text-xs text-neutral-500 hover:text-white transition-colors">Cancel</button>
        </div>
      ) : (
        <div className="flex items-center justify-between pt-2 border-t border-neutral-800">
          <button
            onClick={onOpen}
            className="text-xs font-medium text-indigo-400 hover:text-indigo-300 transition-colors"
          >
            Open →
          </button>
          <div className="flex items-center gap-3">
            <button
              onClick={onRenameStart}
              className="text-xs text-neutral-700 hover:text-cyan-400 transition-colors"
            >
              Rename
            </button>
            <button
              onClick={onDuplicate}
              className="text-xs text-neutral-700 hover:text-indigo-300 transition-colors"
            >
              Duplicate
            </button>
            <button
              onClick={onDeleteRequest}
              className="text-xs text-neutral-700 hover:text-red-400 transition-colors"
            >
              Delete
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

interface VirtualFileCardProps {
  cv: VirtualCV;
  confirmingDelete: boolean;
  isRenaming: boolean;
  renameValue: string;
  renameError: string | null;
  onOpen: () => void;
  onDeleteRequest: () => void;
  onDeleteConfirm: () => void;
  onDeleteCancel: () => void;
  onRenameStart: () => void;
  onRenameChange: (value: string) => void;
  onRenameConfirm: () => void;
  onRenameCancel: () => void;
  onDuplicate: () => void;
}

function VirtualFileCard({
  cv,
  confirmingDelete,
  isRenaming,
  renameValue,
  renameError,
  onOpen,
  onDeleteRequest,
  onDeleteConfirm,
  onDeleteCancel,
  onRenameStart,
  onRenameChange,
  onRenameConfirm,
  onRenameCancel,
  onDuplicate,
}: VirtualFileCardProps) {
  const renameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isRenaming) {
      setTimeout(() => renameInputRef.current?.focus(), 50);
      renameInputRef.current?.select();
    }
  }, [isRenaming]);

  return (
    <div className="group relative flex flex-col gap-3 p-4 rounded-xl border border-neutral-800 hover:border-neutral-700 bg-neutral-900/40 hover:bg-neutral-900/80 transition-all">
      <button onClick={onOpen} className="text-left flex-1" disabled={isRenaming || confirmingDelete}>
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="shrink-0 flex items-center justify-center w-7 h-7 rounded-md bg-amber-950/40 border border-amber-900/30">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-amber-500">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
            </div>
            <p className="text-sm font-semibold text-white truncate">
              {slugToDisplayName(cv.name)}
            </p>
          </div>
        </div>
        <p className="mt-2 text-xs font-mono text-neutral-600">{cv.fileName}</p>
        <div className="mt-2.5 flex items-center gap-2 text-xs text-neutral-700">
          <span>{formatDate(cv.lastModified)}</span>
          <span>·</span>
          <span>{formatFileSize(cv.size)}</span>
          <span>·</span>
          <span className="text-amber-700">memory</span>
        </div>
      </button>

      {isRenaming ? (
        <div className="flex flex-col gap-2 pt-2 border-t border-neutral-800">
          <div className="flex gap-0">
            <input
              ref={renameInputRef}
              type="text"
              value={renameValue}
              onChange={(e) => onRenameChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") onRenameConfirm();
                if (e.key === "Escape") onRenameCancel();
              }}
              placeholder="e.g. my-resume"
              className="flex-1 px-2 py-1 text-xs bg-neutral-800 border border-neutral-600 border-r-0 focus:border-indigo-500 focus:outline-none rounded-l text-white placeholder-neutral-600 transition-colors font-mono"
            />
            <span className="px-2 py-1 text-xs bg-neutral-700 border border-neutral-600 rounded-r text-neutral-500 font-mono select-none">.md</span>
          </div>
          {renameError && <p className="text-xs text-red-400">{renameError}</p>}
          <div className="flex items-center gap-2 pt-1">
            <button onClick={onRenameConfirm} className="px-2.5 py-1 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-500 rounded transition-colors">
              Rename
            </button>
            <button onClick={onRenameCancel} className="px-2.5 py-1 text-xs text-neutral-500 hover:text-white transition-colors">
              Cancel
            </button>
          </div>
        </div>
      ) : confirmingDelete ? (
        <div className="flex items-center gap-2 pt-2 border-t border-neutral-800">
          <span className="text-xs text-red-400 flex-1">Remove from session?</span>
          <button onClick={onDeleteConfirm} className="px-2.5 py-1 text-xs font-medium text-white bg-red-700 hover:bg-red-600 rounded transition-colors">Confirm</button>
          <button onClick={onDeleteCancel} className="px-2.5 py-1 text-xs text-neutral-500 hover:text-white transition-colors">Cancel</button>
        </div>
      ) : (
        <div className="flex items-center justify-between pt-2 border-t border-neutral-800">
          <button onClick={onOpen} className="text-xs font-medium text-indigo-400 hover:text-indigo-300 transition-colors">
            Open →
          </button>
          <div className="flex items-center gap-3">
            <button
              onClick={onRenameStart}
              className="text-xs text-neutral-700 hover:text-cyan-400 transition-colors"
            >
              Rename
            </button>
            <button
              onClick={onDuplicate}
              className="text-xs text-neutral-700 hover:text-indigo-300 transition-colors"
            >
              Duplicate
            </button>
            <button onClick={onDeleteRequest} className="text-xs text-neutral-700 hover:text-red-400 transition-colors">
              Remove
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
