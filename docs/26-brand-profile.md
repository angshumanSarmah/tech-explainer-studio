# 26 — Implemented BrandProfile and consolidation audit

Phase 06 consolidates the existing style; it does not introduce a new visual identity. The approved profile is `tech-explainer@1.0.0` in `src/branding/profile.ts`. It is strict Zod-validated, deeply frozen, browser-safe and referenced by the existing renderer theme. `identity.ts` adds a SHA-256 of the resolved configuration for producer/Director manifests. Only this registered profile is accepted; arbitrary script CSS, fonts, logos, palettes and narrator IDs are unsupported.

## Existing setting audit

| Existing setting | Earlier definition / value | Implemented ownership | Brand or execution concern |
|---|---|---|---|
| Palette | `renderers/remotion/theme.ts`: background `#101826`, surface `#192A3A`, text `#EDF4FA`, muted `#B0C3D1`, request `#45B8D8`, accent `#F6C56B`, success `#5FC8A4`, grid `#25384A` | `BRAND.colors`; theme reexports these tokens | Brand; no new palette. Reserved warning/error tokens reuse existing accent; no new error animation is claimed |
| Font | Theme + bundled Inter Variable package; font readiness loads `600 48px` | `BRAND.typography`, existing local font import/package preserved | Approved family is brand; font readiness and file/package hashes remain renderer infrastructure |
| Typography | Scattered SVG sizes 23,24,26,28,30,32,34,36,42,44,46,68,76; weights 500 default / 650 strong / 700 heading; default line-height 1.22 | Brand size/weight scale consumed by Composition, BrowserRequestFlow and SvgText | Brand scale; node positions, component-specific wrapping and text-baseline layout remain renderer constraints |
| Captions | `CAPTION`: 42px, 34 columns, three lines, y1372–1524 band, 42px line gap, first baseline1420; no word highlighting | `BRAND.captions` consumed by theme, timeline and overlay; text/background/accent explicit, emphasis `none` | Brand appearance/placement; WAV/sample/frame alignment remains timing service |
| Safe zones | Theme x80–920, y180–1540 | `BRAND.safe` | Brand mobile presentation bounds for the existing portrait renderer |
| Entrance motion | 12-frame opacity entrance from0.85, linear interpolation | `BRAND.motion`, consumed by Composition/theme | Existing brand motion at the current 30fps production target; no animation redesign |
| Packet progression | Travel window20–80%, server lift70px; overview causal schedule | Existing theme/flow-state constants retained | Component semantics/layout, not channel branding |
| Intro/outro | Existing hook/summary title cards with authored HTTP steps | Brand records existing implementation identifiers; scene renderer retained | Story/content authored by renderer; no separate bumper or new artwork |
| Logo/watermark | None implemented | Explicit null asset references | No invented path, download or logo |
| Voice | `narration.config.example.json`: `af_heart`, rate1, languageen-us, seed0, settings `kokoro-http-v2`, lexicon `tech-en-v1` | `BRAND.narration`; example config references brand and omits duplicated defaults | Brand voice defaults, unchanged. Explicit existing per-video `settings` override these defaults |
| Audio/runtime resources | Model/voice paths and SHA-256, Python/runtime, CPU/thread/time/file limits, PCM24kHz | Existing config/provider/worker modules | Execution/assets, not brand; model and actual voice metadata remain in scene artifacts |
| Research settings | Phase 05 has topic/audience/emphasis/exclusions and untrusted provenance | ResearchBundle remains separate | Not branding; never moved into BrandProfile |

## Identity, defaults and supported overrides

Legacy VideoScript 1.0.0 fixtures resolve the approved default. Version1.1.0 can include `brand: {id: "tech-explainer", version: "1.0.0"}`. Unknown brands/versions/extra style fields fail validation. The default style and narrator are shared by manual and provider-generated scripts.

The narration config's optional `settings` has priority over brand defaults, preserving earlier explicit per-video voice/rate choices. `brand` is an optional approved reference in the config. `NarrationConfigSchema` validates the fully resolved settings; immutable defaults are not written over an explicit selection. `settings.version` and seed remain versioned and model-specific inference constraints still apply (the installed INT8 model rejects fractional rates). No replacement voice or filtering was introduced.

To revise channel colors, typography, captions or default narrator, edit/version the approved profile centrally and verify new frames/audio; components consume tokens without editing individual scripts. Adding a second approved version requires retaining its old profile/resolver for explicit replay and adding regression coverage. The current release supports one approved version, not a profile editor or arbitrary brand-file loader. Font changes also require a legitimately installed/approved local font asset and updating the bundler's font import/identity; a family name alone cannot supply a font.

Producer manifests record profile ID/version/configuration hash. Narration artifacts retain actual explicit/default settings and model/voice hashes, so a profile's default voice does not falsely describe an override as synthesized. Frame comparisons and actual speech outcomes for this consolidation are recorded in PROJECT_STATUS.md; do not infer pixel or waveform identity from refactoring alone.
