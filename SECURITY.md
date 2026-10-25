# Security Policy

Zenith CV is a client-side application. After the page loads, resume content stays in the browser: on disk via the File System Access API, or in tab memory in sandbox mode. There is no application backend, account system, or analytics.

Chrome and Edge may store a **directory handle** in IndexedDB so the last folder can be reopened. File contents are not copied into that database. A pasted job description in the tailor panel is held in memory only and is discarded on refresh.

## Reporting a vulnerability

Please use [GitHub Security Advisories](https://github.com/LD-111/zenith-cv/security/advisories/new) when they are available. If that form is not enabled, open a [private-as-possible GitHub issue](https://github.com/LD-111/zenith-cv/issues/new) with a clear title such as `Security: …` and avoid posting exploit details in public comments.

There is no paid bug bounty. I will respond as soon as I can.
