"use client";

import { useState, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const INITIAL_MARKDOWN = `# Alex Rivera
**Senior Software Engineer** | San Francisco, CA
alex.rivera@email.com · (415) 555-0192 · [linkedin.com/in/alexrivera](https://linkedin.com) · [github.com/alexrivera](https://github.com)

---

## Summary

Results-driven Senior Software Engineer with 7+ years of experience designing and delivering scalable distributed systems and developer-facing APIs. Passionate about clean architecture, developer experience, and building products that serve millions of users. Proven track record of leading cross-functional teams and shipping high-impact features on time.

---

## Technical Skills

**Languages:** TypeScript, Go, Python, Rust, SQL
**Frameworks & Libraries:** React, Next.js, Node.js, gRPC, FastAPI, Tokio
**Infrastructure:** Kubernetes, Docker, AWS (ECS, Lambda, RDS, S3), Terraform, GitHub Actions
**Databases:** PostgreSQL, Redis, DynamoDB, ClickHouse
**Practices:** TDD, CI/CD, Domain-Driven Design, API Design, Code Review

---

## Experience

### Staff Software Engineer — Meridian Labs
*Jan 2022 – Present · San Francisco, CA*

- Architected and led development of a real-time data pipeline processing **4M+ events/day**, reducing P99 latency from 1.8s to 140ms via Kafka partitioning and consumer group rebalancing.
- Designed a public REST + GraphQL API used by **600+ enterprise customers**, maintaining 99.99% uptime over 18 months.
- Mentored a team of 6 engineers; introduced ADR (Architecture Decision Records) practice that reduced cross-team alignment meetings by 30%.
- Migrated monolithic Django service to a Go-based microservice architecture, cutting infrastructure costs by **40%**.

### Senior Software Engineer — Flux Systems
*Mar 2019 – Dec 2021 · Remote*

- Built an OAuth 2.0 / OIDC identity platform serving **2M+ monthly active users**, integrating with 12 third-party IdPs.
- Reduced CI pipeline duration from 22 minutes to 6 minutes by parallelising test suites and implementing remote caching with Bazel.
- Owned the developer portal (Next.js + MDX), increasing API adoption by 55% quarter-over-quarter.
- Led incident response and postmortem culture; authored runbooks that cut mean time to recovery (MTTR) by 65%.

### Software Engineer — Orbit Commerce
*Jun 2017 – Feb 2019 · Austin, TX*

- Delivered a high-throughput checkout service (Node.js + PostgreSQL) handling **$180M** in annual transaction volume.
- Implemented real-time inventory sync across 3 warehouse systems using event-driven architecture (RabbitMQ).
- Contributed to open-source cart library with 2.4k GitHub stars.

---

## Projects

### **Vela** — Open-Source CLI Deployment Tool
[github.com/alexrivera/vela](https://github.com) · *Go, Cobra, Docker SDK, HCL*

A developer-friendly CLI for deploying containerised applications to any cloud provider with a single command. 1,200+ GitHub stars, 85+ contributors.

### **Chrono** — Distributed Task Scheduler
*Go, Redis, gRPC*

A reliable, horizontally-scalable cron-as-a-service scheduler with at-least-once delivery guarantees, sub-second precision, and a web UI for monitoring job history.

---

## Education

**B.S. Computer Science** — University of Texas at Austin · *2013 – 2017*
Relevant coursework: Distributed Systems, Algorithms & Complexity, Compilers, Database Systems

---

## Certifications & Recognition

- AWS Certified Solutions Architect — Professional (2023)
- Speaker, GopherCon 2022 — *"Building Zero-Downtime Migrations at Scale"*
- Open Source Contributor: Kubernetes, Prometheus
`;

export default function Home() {
  const [markdown, setMarkdown] = useState(INITIAL_MARKDOWN);

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

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-neutral-100 print:block print:bg-white">
      {/* Toolbar */}
      <header className="flex items-center justify-between px-6 py-3 bg-white border-b border-neutral-200 shadow-sm shrink-0 print:hidden">
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
          <span className="text-lg font-semibold text-neutral-900 tracking-tight">
            Zenith CV
          </span>
          <span className="hidden sm:inline text-xs text-neutral-400 font-medium border border-neutral-200 rounded-full px-2 py-0.5">
            v1
          </span>
        </div>

        <div className="flex items-center gap-2">
          <label
            htmlFor="md-upload"
            className="cursor-pointer flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 rounded-md transition-colors"
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
            className="flex items-center gap-1.5 px-4 py-1.5 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 rounded-md transition-colors shadow-sm"
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
              <polyline points="6 9 6 2 18 2 18 9" />
              <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
              <rect x="6" y="14" width="12" height="8" />
            </svg>
            Download PDF
          </button>
        </div>
      </header>

      {/* Split-screen body */}
      <div className="flex flex-1 overflow-hidden print:block print:overflow-visible">
        {/* Left: Editor */}
        <section className="flex flex-col w-1/2 border-r border-neutral-200 print:hidden">
          <div className="flex items-center gap-2 px-4 py-2 bg-neutral-50 border-b border-neutral-200 shrink-0">
            <div className="flex gap-1.5">
              <span className="w-3 h-3 rounded-full bg-red-400" />
              <span className="w-3 h-3 rounded-full bg-yellow-400" />
              <span className="w-3 h-3 rounded-full bg-green-400" />
            </div>
            <span className="text-xs text-neutral-400 font-mono ml-1">
              resume.md
            </span>
          </div>
          <textarea
            value={markdown}
            onChange={(e) => setMarkdown(e.target.value)}
            spellCheck={false}
            className="flex-1 w-full resize-none p-5 font-mono text-sm leading-relaxed text-neutral-800 bg-neutral-50 focus:outline-none focus:bg-white transition-colors"
            placeholder="Start writing your resume in Markdown..."
            aria-label="Markdown editor"
          />
        </section>

        {/* Right: Preview */}
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
                  p: ({ children }) => (
                    <p className="cv-p">{children}</p>
                  ),
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
                    <a href={href} className="cv-a" target="_blank" rel="noopener noreferrer">
                      {children}
                    </a>
                  ),
                  hr: () => <hr className="cv-hr" />,
                  code: ({ children }) => (
                    <code className="cv-code">{children}</code>
                  ),
                  blockquote: ({ children }) => (
                    <blockquote className="cv-blockquote">{children}</blockquote>
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
