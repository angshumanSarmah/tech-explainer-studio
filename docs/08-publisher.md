# 08 — Agent 3: Publisher, platform exports, and analytics

## Mission

Publish the **specific approved artifact**, not an arbitrary MP4 path. The Publisher uses deterministic metadata transforms and official upload APIs. It is not an unconstrained social-media agent.

## YouTube flow

1. Load `ReleaseManifest` and verify its final MP4 SHA256, metadata revision, fact/media/video approvals.
2. Present final title, description, links, rights/AI disclosure decisions, privacy status, and destination channel.
3. Require separate explicit `publish` command/consent (no auto-public from render).
4. Resolve Google OAuth tokens from secure local store; use minimal required upload scope.
5. Upload with `privacyStatus: private` **explicitly**. Do not trust endpoint defaults.
6. Persist remote video ID, response, timestamps and error/processing state.
7. Confirm processing status before enabling separate schedule/public action.
8. Store metadata lineage and provide exportable URL after confirmed upload.

### Why private must be explicit

Google's November 2, 2026 YouTube Data API revision says new uploads from unverified API projects are **no longer forced private**, and missing privacy may default **public**. Therefore private-by-default is an **application safety requirement**, not a platform assumption. See [official revision history](https://developers.google.com/youtube/data/revision_history).

## Compliance fields

- Audience/child-directed classification: user-confirmed value, not guessed from topic.
- Realistic altered/synthetic disclosure when required: record user decision and map to supported API field (`status.containsSyntheticMedia` in current video resource).
- Copyright/license log for music, sounds, images, fonts and cited sources.
- Source links in description when useful; citations support credibility but do not license copied media.
- If generated media is illustrative rather than real, avoid presenting it as documentary footage.
- Re-check YouTube policies before enabling public scheduling and changes to thumbnails/Shorts limits.

## Metadata generator

Input: approved topic, learning outcome, script summary, content series, original source URLs, language, channel brand settings, optional site/companion repo link, measured duration.

Output: proposed titles (no clickbait false claims), 1 description, small relevant hashtag set, thumbnail text, category, chapters **only if the format and actual measured timeline warrant**. Never derive chapters from average scene duration; don't force chapters into 60-second videos.

**Remove old product-specific metadata**: no `PHI`, `feature_id`, `product update`, Jira ticket identifiers, internal links or workplace branding.

## Instagram MVP

Generate `instagram-caption.md`, a correctly encoded video, and a cover frame. Publish via Instagram app or authorized native tools manually. Do not assume the YouTube API integration automatically covers Reels. Instagram Graph/API automation is a separate P2 workstream with permission/platform constraints and verification.

## Publishing states

`pending_approval`, `approved`, `upload_requested`, `uploading`, `uploaded_private`, `processing`, `ready_private`, `scheduled`, `public`, `failed`, `reconciliation_needed`.

`uploaded_private` does **not** imply that video processing succeeded. `scheduled` does not imply already public. Store both intended and observed platform state.

## YouTube upload request outline

```ts
interface UploadRequest {
  releaseId: string;
  destination: 'youtube';
  privacy: 'private';
  videoPath: string; // local artifact resolved from signed manifest
  videoSha256: string;
  metadataSha256: string;
  title: string;
  description: string;
  tags: string[];
  madeForKidsDecision: boolean;
  containsSyntheticMediaDecision?: boolean;
}
```

`madeForKidsDecision` requires an explicit creator decision. If unanswered, the UI must block uploading rather than inventing a value.

## Analytics (phase 2)

Collect permitted metrics using YouTube Studio or authorized Analytics API. Present available values with reporting window and freshness. Track: impressions, views, average percentage viewed (where reported), engaged views, subscriber change, clicks to companion repos, and effort/cost per episode. Show `unavailable` when not returned. Don't optimize solely for views at the cost of explanations.

A performance analyst may recommend new topics, but cannot publish or change approved editorial constraints without user action.

## Implemented Phase 08 boundary (offline only)

`publishApproved` in `src/release/service.ts` is a default-deny application boundary with an injected **lazy** Publisher factory. It performs fresh eligibility checks before constructing the client; denied/stale cases make zero client/outbound calls. Exact hash-checked MP4 and cover bytes, validated metadata and an explicit literal `privacy: private` are passed to the adapter, avoiding reopening a mutable video path after approval. Approval IDs and any bound active job are rechecked immediately before adapter construction. Tests use only a fake adapter. No production YouTube adapter, OAuth, network upload, scheduling or public action exists yet; those flows above remain planned and need their own authorization and platform review. The local boundary is not cryptographic authentication against a malicious operator who can rewrite application code or SQLite.
