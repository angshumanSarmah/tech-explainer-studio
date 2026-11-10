# 10 — Visual identity, motion language, sound, and mobile readability

## Style objective

Create **an original visual system** with the clarity of animated system diagrams: packets move along routes, nodes change state, queues visibly fill/drain, data structures animate transitions, and labels appear as the viewer needs them. The user-supplied DevMonk screenshots establish a *general production idiom*, not a template or palette to copy exactly.

## Proposed working theme: "Signal / Trace" (unapproved brand concept)

These colors and names are **internal design tokens**, not a final brand or a copy of reference screenshots.

| Token | Hex | Meaning |
|---|---|---|
| `bg0` | `#101826` | Deep slate base |
| `surface` | `#192A3A` | Nodes/panels |
| `textPrimary` | `#EDF4FA` | Titles and essential labels |
| `textMuted` | `#B0C3D1` | Supporting labels |
| `flow` | `#45B8D8` | Active data movement |
| `highlight` | `#F6C56B` | Selected step / focus |
| `success` | `#5FC8A4` | Completed / acknowledgement |
| `alert` | `#F17D83` | Error / rejected path |
| `grid` | `#25384A` | Optional subtle coordinates |

Keep color semantics consistent across episodes, and distinguish status using both shape/text and color. Verify contrast ratios in actual renders.

## Typography

- Human-readable sans serif for narrative labels; legible mono for code and small protocol fields.
- No tiny 8px packet identifiers that only look good on desktop.
- At 1080×1920, working guideline: main hook ~72–100px, section label ~40–54px, core diagram labels ~32–44px, captions ~44–58px. Verify on actual mobile display.
- Show at most 1 key definition and 1 primary focal motion at a time.
- Long identifiers should be abbreviated only if the explanation won't be distorted.

## Motion tokens

- `appear`: opacity and slight position ease; ~8–14 frames.
- `travel`: directional linear/eased packet movement; source/target remain visible.
- `pulse`: event acknowledgement with controlled brightness/radius (never strobing).
- `queue`: bounded insertion, hold, dequeue, counter update.
- `expand`: zoom into a component without a discontinuous location jump.
- `focus`: dim irrelevant parts while preserving context.
- `compare`: two strategies animate through the same input, preferably side-by-side.

Cues describe cause and effect, not just decoration. Avoid camera movement while narration explains a tiny precise label.

## Mobile-safe layout

**Implemented Phase 02 guide:** labels are bounded by x=80–920, y=180–1540 in the 1080×1920 composition. This leaves top, right-control and bottom reserves. A small progress indicator sits below the label area at y=1570; the bottom 260 pixels are empty. `--guides` overlays the guide rectangle; normal output hides that overlay. The quiet background grid is decorative. Browser and server retain fixed positions, with cyan request movement downward and green response movement upward in separate lanes. Original SVG nodes, text labels and arrowheads use the tokens above; no outside footage/screens are used. Inter is bundled locally. These coordinates are a tested local layout baseline, not guaranteed platform UI standards.

```text
┌──────────────────────── 9:16 ────────────────────────┐
│ Top reserve: title/channel/platform UI may overlap │
│                                                      │
│   CORE VISUAL AREA                                   │
│   diagram, camera and data movement                  │
│                                                      │
│   CORE VISUAL AREA                                   │
│                                                      │
│   Caption region (platform safe)                     │
│                                                      │
│ Bottom reserve: profile/caption/player UI overlays  │
└──────────────────────────────────────────────────────┘
```

Actual safe-zone coordinates **must be tested** on YouTube Shorts and Instagram on current devices; platform overlays vary. MVP defaults should be configurable layout guides, not asserted permanent pixel standards. Use templates with overlays visible during preview and hidden at export.

## Caption design

- Narration-aligned 1–2 lines with a reasonable characters-per-line limit.
- Active word highlighting is optional; meaning must survive without it.
- Preserve capitalization of `HTTP`, `Git`, `B-tree`, `TCP`; technical vocabulary pronunciation tested.
- Avoid letting external platform UI obscure subtitles; do not embed hashtag/search-bar decorations that mimic another account.

## Audio identity

- Local Kokoro voice, deliberate pace, human spot-check of technical words.
- Quiet per-event sound effects for send/receive/error (original or properly licensed files).
- Music optional; avoid constant soundtrack in early educational videos.
- Loudness and peak targets measured in final export; no clipping, duck effects under narration.

## Camera and 3D

Start entirely with SVG/Remotion and reusable 2D vector primitives. 3D is justified only if it improves a spatial explanation (e.g. memory stacks, CPU cache hierarchy, 3D graphics pipeline), not because reference videos happen to use camera depth.

## Thumbnail and brand rules

- Distinct from competitor UI, icons, font combinations, and layout.
- A single clear concept and 2–5 impactful words (guideline, not hard rule).
- Thumbnail must match the mechanism actually shown; no invented company claims.
- Maintain a small design token library and reusable compositions; brand identity can be decided after 3 prototype videos.

## Visual acceptance tests

1. Freeze-frame screenshot is understandable on a phone.
2. Subtitles never collide with the key diagram or platform overlays in test fixtures.
3. Moving data has stable identity across transitions.
4. Error/counter state agrees with narration.
5. No stray collisions, overflows, cropped labels, invisible targets or high-frequency flashes.
