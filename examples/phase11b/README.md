# Synthetic city demand proof

`city-demand.videoscript.json` is an original four-beat narrated demonstration for the existing Producer. `minimal.videoscript.json` is a single full-story scene with the same synthetic fixture. Neither script has factual, rights, playback or release approval. The source hash identifies the canonical JSON `{density,vehicles}`; it is an authored fixture identity, not evidence of a real city.

```bash
npm run studio -- script validate --file examples/phase11b/city-demand.videoscript.json
node scripts/render-phase11b.mjs
node scripts/render-phase11b.mjs --replay output/phase11b/run-<reported-suffix>
node scripts/render-phase11b.mjs --replay output/phase11b/run-<reported-suffix> --flat
```

The runner explicitly uses installed local Kokoro/Chrome and the existing measured caption/audio/QC pipeline. Raw WAVs are retained; integer constant DC removal retains exact sample count and detected speech endpoints, with hash-bound receipts. Motion windows follow measured speech activity; they are not word alignment. No models, packages or fonts are downloaded. Every run gets a fresh ignored output directory. `STUDIO_BROWSER` may identify an existing local browser executable; the default is the documented macOS Chrome path.

The template takes `sceneType:synthetic-city-demand`, `renderMode:isometric-svg|flat-svg`, `cameraPreset:follow-demand|wide`, `storyBeat:establish|demand|respond|pattern|full`, integer `focusCell` in 0..4, exactly four 25-value `density` snapshots in 0..1, and 1–6 uniquely identified vehicles with exactly five bounded road waypoints. Routes use axis-aligned integer-grid roads. Palette fields are fixed semantic brand roles, `assetIds:[]`, `illustrative:true`, `dataKind:synthetic`. All objects are strict. The existing optional single `move/mechanism` cue controls the resolved frame-progress window. Phrase anchors still need reviewed audio alignment. Full scenes require 10–20s, each partial beat 2–6s. The main fixture renders 16.3s because one measured narration takes 4.3s.

Four partial beats select adjoining quarters of one spatial story; data, topology and routes should stay identical across those scenes for continuity. `full` runs all four quarters in one scene. `isometric-svg` projects shaded original extrusions; `flat-svg` renders the same story as roof footprints. Both work without WebGL and make no runtime backend guess. Choose the fallback explicitly and rerender; changed props invalidate affected visual caches while preserving unchanged speech.

The fixed grid has 25 cells and 19 original building shapes; at most six vehicle glyphs and one pulse are drawn. No textures, models, map tiles, footage, coordinates from a real place, arbitrary geometry, shader or generated code are accepted. Asset IDs are deliberately empty for this proof; the Phase 11 image manager and Phase 08 rights checks retain their existing contract. This phase adds no model/video importer. The authored motion does not implement real rider matching, dispatch or pricing.

Read `output/phase11b/REVIEW.md` and PROJECT_STATUS.md for actual probe results, MP4s, frame evidence and measured costs. Visual quality, voice naturalness and exact word/event timing need human phone playback. Stop after this phase.
