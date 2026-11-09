# 24 — Existing code migration and third-party comparison

## Source-of-evidence limits

The user supplied screenshots of `phi-video-gen/ARCHITECTURE.md`, `content-director.ts`, `video-producer.ts` and `publisher.ts`. The documentation below reports **visible behavior**, not a full code audit. It also describes `darkzOGx/youtube-automation-agent` based on its public README/documentation. There has been no authorized import of private source into this package.

## Observed `phi-video-gen` structure

| File / capability shown | Inferred role from screenshots | Recommended action if legally allowed |
|---|---|---|
| `src/types/video-script.ts` | JSON/TypeScript contract between Director/Producer | Review actual file, create explicit v1 import adapter |
| `content-director.ts` | Claude CLI + MCP, Jira/Confluence/Figma, product-user prompt | Reimplement technical profile / DeepSeek adapter; do not copy PHI prompt |
| `video-producer.ts` | Scene validation; audio/visual work; Figma validation; UI-recording fallbacks | Extract orchestration concepts; replace monolith with scene registry |
| `audio-worker.ts` | Local Kokoro/Noiz narration | Port permitted generic audio code or reimplement adapter |
| `visual-worker.ts` | HTML slides, Figma UI screenshots, Mermaid fallback | Optional screen/UI renderer; not primary for tech explainers |
| `recording-worker.ts` | Authenticated Playwright app recording and highlights | Separate optional video profile; no access to employer app in personal repo |
| `assembler.ts` | FFmpeg/ffprobe assembly with transitions | Reuse pattern; independently validate vertical output |
| `publisher.ts` | Title/description/tags + YouTube `uploadVideo` | Rebuild metadata for tech channel; explicit release gating |
| `youtube-client.ts` | Imported by Publisher, but not fully shown | Audit OAuth, privacy, retries, quotas and idempotency before reuse |

## Key pitfalls to prevent

- The old Content Director prompt asserts *product walkthrough, no technical jargon, no diagrams*; this conflicts with our educational content.
- The old Producer visibly blocks `diagram` scenes. Our profile should allow them and register `tech-animation` explicitly.
- The old Publisher derives `PHI` / `product update` / `feature_id` tags; those must never leak into the tech channel.
- The old Publisher estimates chapter timestamps using averages; use **measured scene start times** when chapters are applicable.
- Screenshots do not prove a complete approval gate inside `runPublisher()`; implement an explicit exact-hash gate in the new pipeline.
- Figma leaves, private app routes, workplace credentials and Jira payloads are not transferable by default.

## Where to learn from `youtube-automation-agent`

| Upstream feature | Priority | Build/reuse guidance |
|---|---|---|
| Checkpointed/resumable jobs | P1 | Use design inspiration; lightweight SQLite implementation |
| Evidence desk / rights approvals | P1 | Required conceptual guardrails, independent implementation |
| Scene repair studio | P2 | CLI scene-only render now, UI later |
| YouTube OAuth/upload | P1 | Reference after reviewing upstream and official API docs |
| Analytics feedback loop | P2 | Delay until enough own videos to measure |
| Local slideshow renderer | Skip | Does not meet primary visual-storytelling goal |
| Paid generative video providers | Skip | Expensive and less deterministic for technical diagrams |
| Autonomous growth scheduler | Skip | Explicit human publishing and measured quality first |

## Clean-room boundary workflow

1. Confirm rights/ownership of every proposed copied file.
2. Do not commit old code to new repo until rights confirmed.
3. Write architecture-agnostic interfaces from these docs first.
4. Implement and test small units independently using synthetic fixtures.
5. If authorized, port generic code **module by module**, preserving appropriate notices, replacing employer references and secrets.
6. Record origin/license for each transplanted file and verify with code review.

## Reversal criteria

Reconsider a full fork only if an implementation audit shows that most upstream work—including typed Remotion scenes, Kokoro, evidence gates and publisher—can be retained with negligible modification. Based on known public docs and screenshots, a new architecture-first repository remains a better fit.
