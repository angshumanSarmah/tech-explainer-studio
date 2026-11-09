# 19 — Verified starting references and revalidation checklist

**Checked:** 2026-11-06 for this design package. Prices, models, policies and tool versions can change; treat links as source-of-truth entry points and re-check before enabling a feature.

## Content and reference libraries

- [CodeCrafters — Build Your Own X](https://github.com/codecrafters-io/build-your-own-x): index of build-from-scratch tutorial links; README claims CC0 **for the index**, not all externally linked tutorials.
- [System Design Primer](https://github.com/donnemartin/system-design-primer): system design topics, architectures and related discussions. Verify individual linked resources and licensing.
- [MDN HTTP overview](https://developer.mozilla.org/en-US/docs/Web/HTTP/Overview): human-readable HTTP concepts.
- [RFC 9110 — HTTP Semantics](https://www.rfc-editor.org/rfc/rfc9110) and [RFC 9112 — HTTP/1.1](https://www.rfc-editor.org/rfc/rfc9112): primary standards for first prototype.

## Implementation frameworks

- [Remotion official licensing](https://www.remotion.dev/docs/license/pricing) and [license text](https://github.com/remotion-dev/remotion/blob/main/LICENSE.md): individual/small-organization free terms with conditions; re-evaluate on growth and before a SaaS/tooling business.
- [Remotion Composition docs](https://www.remotion.dev/docs/composition): `Composition`, dimensions, frame rate, sequence model.
- [Kokoro-82M model card](https://huggingface.co/hexgrad/Kokoro-82M): Apache-2.0 model license; voice/runtime dependencies may have separate licenses.
- [DeepSeek API models/pricing](https://api-docs.deepseek.com/quick_start/pricing/): provider/model choices, token-based billing; **not a free API**.
- [DeepSeek Chat Completions](https://api-docs.deepseek.com/api/create-chat-completion/): JSON output, tool calling, API request/response behavior.
- [DeepSeek Responses API](https://api-docs.deepseek.com/api/create-response/): schema-aware output and built-in tools vary by model; use provider abstraction.

## Platform APIs / policy

- [YouTube Data API video insert](https://developers.google.com/youtube/data/reference/rest/v3/videos/insert): OAuth and upload contract.
- [YouTube video resource](https://developers.google.com/youtube/data/reference/rest/v3/videos): metadata, privacy and synthetic-content fields.
- [YouTube revision history](https://developers.google.com/youtube/data/revision_history): **November 2, 2026** changed unverified-project private restrictions; explicitly set `private`, as omitted privacy may mean public. November 3, 2026 adds Shorts thumbnail-related changes; recheck processing/thumbnail requirements.
- [YouTube video update](https://developers.google.com/youtube/data/reference/rest/v3/videos/update): be cautious with partial updates; unspecified fields may be removed.

## External automation reference

- [darkzOGx/youtube-automation-agent](https://github.com/darkzOGx/youtube-automation-agent): useful reference for approval-first workflow, job recovery, YouTube publishing and analytics. MIT repository, according to its README; preserve applicable license notices if code is adapted. **Not our primary foundation.**

## User-supplied implementation reference — not externally verified

- Screenshot descriptions of `phi-video-gen`: `content-director.ts` drives a Claude CLI tool flow, product/UI/Figma-specific prompts; `video-producer.ts` validates scenes, generates local Kokoro audio, uses Playwright/Figma and FFmpeg, tracks timing/fallback; `publisher.ts` derives YouTube metadata and uploads.
- These are **visual observations from supplied screenshots**, not a run of the repo, not a security audit, and not evidence of ownership/licensing. Source files were **not** programmatically inspected in the current conversation.
- User supplied DevMonk-inspired animated system screenshots and another video. They are **visual principles only**; their exact scripts, assets, designs, metadata and brand are not reused.

## Revalidation tasks before shipping

- [ ] Confirm Remotion license eligibility and any applicable product/server-rendering restrictions.
- [ ] Confirm DeepSeek model ID, rate limits, pricing, JSON mode/schema capabilities.
- [ ] Confirm Kokoro voice/ONNX runtime installation, redistribution and dependencies.
- [ ] Confirm YouTube OAuth setup, required scopes, privacy, synthetic media/made-for-kids decisions.
- [ ] Confirm current platform caption and thumbnail behavior.
- [ ] Verify every source/tutorial's own license, not just an index license.
- [ ] Confirm IP ownership of any code reusing patterns from the workplace project.
