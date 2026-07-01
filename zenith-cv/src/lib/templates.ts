export const DEFAULT_TEMPLATE = `# Alex Rivera
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

export const BLANK_TEMPLATE = `# Your Name
**Job Title** | City, Country
email@example.com · [linkedin.com/in/yourprofile](https://linkedin.com) · [github.com/yourhandle](https://github.com)

---

## Summary

Write a brief professional summary here.

---

## Experience

### Job Title — Company Name
*Start Date – End Date · Location*

- Key achievement or responsibility
- Key achievement or responsibility

---

## Education

**Degree** — University Name · *Start – End Year*

---

## Skills

**Languages:** ...
**Tools & Frameworks:** ...
`;
