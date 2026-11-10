# 11 — Security, IP ownership, and platform compliance

## Highest-priority legal boundary

The screenshots labeled `phi-video-gen` include an internal product/DevRel workflow, company product names and possibly private code, Jira, Confluence and Figma integrations. **We have not verified ownership or reuse rights.** Rebuild common patterns independently, or reuse actual source only with written permission. Never copy corporate API keys, screenshots, code, product names, Figma assets, internal endpoints or sensitive workflows into a personal public repo.

The architecture ideas themselves—three stages, VideoScript JSON, FFmpeg assembly, local TTS—are general engineering concepts; this does not automatically license someone else's implementation.

## Threat model

| Threat | Entry point | Control |
|---|---|---|
| Prompt injection from README/docs | GitHub/web source text | Treat as untrusted data; no tool instruction execution |
| Secret leakage to LLM | Jira/private files/config | Source allowlist, secret scrubber, explicit send preview |
| Arbitrary code execution | Generated JSON visual props | Strict Zod and component registry; no dynamic `eval`/`Function` |
| Command injection | FFmpeg/browser CLI args | Argument arrays, allowlisted input paths/codecs, no shell interpolation |
| SSRF / unsafe URL | Source fetcher | HTTP(S) only, block localhost/private/IP metadata ranges, bounded redirects |
| Credential theft | YouTube OAuth/DeepSeek keys | OS Keychain / environment, least privilege, never commit or log |
| Unauthorized public post | API upload | Approval tied to hash, private explicit, review destination |
| Copyright breach | Tutorial/diagram/music/media | Source and rights ledger, block unknown license before release |
| Outdated technical claims | Cached source summary | Source revision/version in claim ledger, periodic editorial refresh |
| Duplicate publish | Retry after timeout | Durable outbox and remote reconciliation |

## Implemented source boundary (Phase 05)

The source CLI requires an explicit URL and `--confirm-public`. Native HTTP(S) requests have fixed headers, no auth/cookies/proxy inheritance, default TLS checks, all-answer public DNS validation, pinned lookup/peer checks and fresh connections. Redirects are bounded, revalidated and limited to explicitly approved hosts; HTTPS downgrade is rejected. Private/special IPv4/IPv6, IP literals, local/private-service names, userinfo, query strings and nondefault ports are denied. Decoded URL paths use the same normalized credential-pattern detector as source text, in addition to the original conservative URL checks. Credential-like paths fail before DNS/fetching and are rejected when loading saved snapshots. This deliberately excludes some legitimate sites. The initial policy is a conservative static address policy; it is not a general Internet reachability classifier. Network-level egress policy remains useful defense in depth but is not added by this phase.

Limits are 512 KiB default / 2 MiB maximum body, 16 KiB headers and a 10-second default / 30-second maximum total deadline. Compressed bodies and non-UTF-8/nontext content are rejected. The OS DNS lookup itself may finish after timeout, but no subsequent request may start after the deadline. Only the exact user-requested document and allowed redirects are fetched; no discovered link or subresource is loaded.

Raw documents are transient bounded memory only; persisted snapshots contain hash/provenance plus ≤1200 characters of inert plain text. Known command/instruction/credential/hidden-control patterns quarantine the complete document with no excerpt. HTML extraction never renders or executes HTML. This screening is heuristic, can reject benign technical examples, and cannot certify absence of novel secrets or injection. Every excerpt stays untrusted even when clean. No model/tool consumer exists; future Director integration must preserve that data boundary.

Claim evidence requires exact clean excerpt quotes, reviewer action and a separate current ledger approval before context export. JSON identities are operator assertions; hashes detect staleness but cannot stop a malicious local editor from forging approvals. Fact approval neither establishes copyright permission nor approves a video. License matches are only unverified mentions and `reusePermission` remains `not_granted`; no linked tutorial inherits its index's license. Keep a separate human rights review before release.

Research bundles apply the same boundary to every URL and pasted note. All declared approvals/URL shapes validate before I/O. An outer abort signal and native streamed-byte callbacks enforce aggregate source-count/byte/time/request limits across sequential entries; each fetch keeps its original DNS/IP/redirect/per-source limits. Deduplication includes selection and effective approval policy, preventing a broader allowlist on one entry from authorizing another. Original URLs without fragments and per-input metadata remain mapped even after content convergence. Pasted raw text is not stored in the bundle, and malicious notes cannot become user instructions; known unsafe content is quarantined like remote content. The distinct editorial brief is bounded/screened and hash-bound in reviewed ledgers. All prior heuristic/local-identity limitations still apply.

## Credential management

- Use `DEEPSEEK_API_KEY` or local configuration only where required. Never put keys in VideoScript, `README`, Git history, output logs or approval artifacts.
- YouTube OAuth refresh tokens should be stored outside output folders and protected with filesystem permissions / OS Keychain when available.
- `.gitignore`: `.env`, `.env.*` (except `.env.example`), `output/`, `data/`, downloaded voice model weights, private assets and tokens.
- Redact credentials from subprocess stdout/stderr before persistence.
- Rotate keys immediately if accidentally committed and purge accessible copies.

## Execution safety

- No built-in tool giving the LLM shell/file-write permissions during content planning.
- If a repo is cloned for code study, pin commit and perform analysis in a sandbox with no ambient secret mounts or unrestricted network. Do not run arbitrary `npm install`/scripts from third-party repos in the main environment.
- Test-code execution (e.g. a tiny HTTP server demo) happens in a separate constrained workspace, with timeouts and nonprivileged user.
- Asset fetch URLs have size and content-type limits; images/video decoded in controlled processes.

## Rights ledger

For each referenced source or asset, store: creator, canonical URI, work title, license type/version, purpose, adapted/quoted portion, required attribution, date verified, reviewer decision. **Linking to a tutorial** is not the same as licensing its text, code or diagrams.

The Build Your Own X README claims CC0 for **its index**, but this does not automatically apply to all external tutorials it links. The upstream `youtube-automation-agent` project advertises MIT; if we adapt any of its code, retain MIT license/copyright notices and document which files were incorporated.

Remotion currently offers a free license to eligible individuals/small organizations; confirm the exact license at time of shipping, especially if team size or business model changes. Kokoro model card lists Apache 2.0; check runtime/dependency licenses separately.

## Platform policy

- YouTube: use official OAuth upload API, explicit private default and accurate audience/synthetic-content disclosures.
- AI-generated explanatory diagrams or artificial narration are not inherently realistic deceptive content; however **decide disclosure using current official guidance**, not an assumed blanket exemption.
- Instagram: follow current Reels API/scheduler rules if automating later; use manual native upload initially.
- Never buy fake views, scrape private analytics, circumvent anti-bot restrictions, or mass-post unreviewed reused content.

## Security release gate

A release is blocked on: missing rights approval, unresolved secret scan, unsupported external URL, failed artifact hash, unknown executable content, missing human platform approval, and known inaccurate claim.
