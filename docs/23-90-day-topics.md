# 23 — 30-topic backlog for the first 90 days

This is a **candidate backlog**, not a commitment to daily uploads and not derived from the DevMonk reference videos. Topics draw from GitHub build-from-scratch ideas, system-design concepts and authoritative documentation. Verify source links, versions, technical scope and rights before generating each episode.

| # | Series | Topic / angle | Primary animation | Complexity |
|---:|---|---|---|---|
| 01 | HOW | How an HTTP server handles a request | `BrowserRequestFlow` | S |
| 02 | WHY | Why message queues exist | `EventQueue` | S |
| 03 | HOW | How Git stores a commit | `HashObjectGraph` | M |
| 04 | WHY | Why databases use indexes | `BTreeLookup` | M |
| 05 | HOW | How DNS looks up a domain | `NetworkPacket` | M |
| 06 | HOW TO | Build a tiny URL shortener | request + DB lookup | M |
| 07 | WHAT | What exactly is a load balancer? | client → alternative servers | S |
| 08 | HOW | How a browser sends an API request | browser/server + headers | S |
| 09 | WHY | Why caching makes systems faster | before/after timeline | S |
| 10 | HOW | What happens on a cache miss? | request fallthrough | S |
| 11 | HOW TO | Build a simple rate limiter | tokens, refill, requests | M |
| 12 | HOW | How a token bucket works | rate limiter simulation | M |
| 13 | WHY | Why databases use transactions | commit/rollback states | M |
| 14 | HOW | How a B-tree finds a key | B-tree traversal | M |
| 15 | HOW | How a queue survives a burst | bounded queue and workers | S |
| 16 | WHAT | What is a reverse proxy? | before/after traffic flow | S |
| 17 | HOW | How a basic compiler tokenizes code | code trace + tokens | M |
| 18 | HOW TO | Build a tiny JSON parser | token stream, parse states | L |
| 19 | HOW | How a search index maps words to documents | inverted index animation | M |
| 20 | WHY | Why distributed systems duplicate work | retry/idempotency state | M |
| 21 | HOW | How TLS protects an HTTP connection | handshake + encrypted flow | L |
| 22 | HOW | How a CPU executes an instruction | register/ALU timeline | L |
| 23 | WHAT | What is a hash table? | key hash → bucket | M |
| 24 | WHY | Why Git content-addresses objects | hash graph updates | M |
| 25 | HOW TO | Build a tiny key-value store | set/get, persistence | M |
| 26 | HOW | What happens during a database query? | parse → plan → fetch | L |
| 27 | WHY | Why horizontal scaling changes architecture | load growth & replicas | M |
| 28 | HOW | How publish/subscribe messaging works | multiple consumers | M |
| 29 | HOW TO | Build a basic HTTP router | pattern matching | M |
| 30 | UNDER THE HOOD | What actually happens in an event loop? | tasks, microtasks timeline | L |

**S/M/L** = relative estimated animation complexity, not fixed hours. The sequence intentionally reuses network flows, queues and indexes to validate the component engine before deeper compiler/CPU topics.

## Topic preparation template

```markdown
### Topic ID
- Series:
- Audience:
- One-sentence learning outcome:
- Canonical source links and versions:
- Rights/licensing concerns:
- Factual claims to verify:
- Illustrative vs real measurements:
- Key mechanism / state transitions:
- Existing reusable components:
- Expected scene count / voiceover target:
- What is explicitly out of scope:
- Companion original GitHub tutorial opportunity:
- Reviewer / approval:
```

## Editorial sequencing guidance

- First five videos establish component vocabulary and technique; do not add 3D until 2D quality is proven.
- Separate **explaining a mechanism** from **building a complete implementation**. Shorts can introduce a build, while longer original projects demonstrate code.
- Publish at the rate quality permits. Thirty candidate topics do not mean thirty videos must be produced in 90 days.
