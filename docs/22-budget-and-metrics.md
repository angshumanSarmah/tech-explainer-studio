# 22 — Cost policy, unit economics, and success metrics

## Cash-cost philosophy

Target **zero mandatory monthly software subscriptions** for MVP. The important exception is DeepSeek API: usage-based billing applies. Local rendering/TTS are free of SaaS charges but not costless in electricity, time and machine resources. Remotion and bundled assets must remain within license eligibility.

## Cost classes

| Type | Examples | How to measure |
|---|---|---|
| LLM usage | DeepSeek prompt/completion tokens | Provider usage × current per-token rates |
| Rendering | Local machine/energy, disk storage | Wall time, storage and optional cost allocation |
| Narration | Kokoro local compute | Voice generation time, troubleshooting effort |
| Publishing | YouTube/Instagram native tools | Software fee usually none; API quota/constraints |
| Asset rights | Music, sound effects, fonts | Per-license expenses, otherwise original assets |
| Human time | Research, visual QA, animation debugging | Tracked minutes × internal hourly cost |
| Equipment | Existing Mac, storage backup | Optional amortized allocation |

## LLM pricing formula (parameterized)

```text
input_cost_usd  = input_tokens  / 1_000_000 * input_price_per_million
output_cost_usd = output_tokens / 1_000_000 * output_price_per_million
llm_cost_usd    = input_cost_usd + output_cost_usd
```

Apply actual **cache-hit rates and pricing windows** if the provider bill exposes them. Do not hardcode November 2026 rates into business forecasts; read current [official DeepSeek pricing](https://api-docs.deepseek.com/quick_start/pricing/). The producer should work from a saved VideoScript even if API balance is zero.

## Cost ceilings

- Require `MAX_EPISODE_API_USD` and a warning at 80% of limit.
- Bound number of source URLs fetched, model calls and repair rounds.
- Don't use Pro model automatically; allow explicit per-task upgrade when cheaper model fails an eval.
- Log job cost even if final video rejected.
- **No silent fallback to paid AI image/video service**; rendering stays programmatic.

## Evaluation of 10 / 30 / 60 videos per month

At all volumes, local software subscriptions may stay at ₹0 if license eligibility holds and DeepSeek is not included in that subscription total. Actual **API spending scales with token usage**, and human workload may become the practical limit. Avoid presenting invented fixed prices per video. Instead collect real usage for five prototypes and calculate:

```text
monthly_api_spend = avg_real_llm_cost_per_video * video_count
monthly_labor_hours = avg_real_human_hours_per_video * video_count
monthly_cash = monthly_api_spend + rights + backup + optional paid services
```

Revenue should be modeled as **zero initially**. Don't assume Shorts ad revenue covers costs. Sponsorship and courses require actual demand and audience trust.

## Production performance dashboard (P2)

- Per-job API token costs, total run attempts and failure reasons.
- Total human hours and manual repairs per episode.
- Number of reused animation components vs newly authored components.
- Media QC pass rate and script factual corrections before publication.
- Views, average percentage viewed, retention curves and shares/saves where available and permitted; distinguish platform metrics and time windows.
- Engaged followers, click-throughs to original GitHub repos, requests for deeper build tutorials.

## Decision thresholds (hypotheses to calibrate)

- If >50% of scenes require manual custom animation across ten videos, build additional reusable primitives before raising publishing frequency.
- If narration pronunciation consumes >20% of edit time, improve lexicon/voice selection before subscribing to paid TTS.
- If stable build throughput is lower than planned, reduce cadence rather than technical accuracy.
- If no one requests deeper material, delay courses/community/paid website development.

These are internal starting thresholds, not industry benchmarks.
