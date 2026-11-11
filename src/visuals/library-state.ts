import type { QueueProps } from '../domain/library.ts';
import type { RegisteredVisual } from '../domain/visual-library-registry.ts';
import { easeInOut } from './cache-aside-state.ts';
export function mechanismProgress(
  visual: RegisteredVisual,
  frame: number,
  durationFrames: number,
) {
  if (
    !Number.isInteger(frame) ||
    durationFrames < 30 ||
    frame < 0 ||
    frame >= durationFrames
  )
    throw new RangeError('Mechanisms need at least 30 in-range integer frames');
  const t = frame / (durationFrames - 1),
    cue = visual.cues[0];
  if (!cue) return t;
  if (cue.trigger.kind !== 'progress')
    throw new Error('Phrase cue requires reviewed audio alignment');
  return Math.max(
    0,
    Math.min(1, (t - cue.trigger.from) / (cue.trigger.to - cue.trigger.from)),
  );
}
export type QueueItem = {
  id: string;
  label: string;
  arrival: number;
  admitted: number | null;
  start: number | null;
  end: number | null;
  dropped: boolean;
};
/** Waiting capacity excludes the one in-service item. Completions precede same-time arrivals.
 * Block policy retains producer-side FIFO backlog; drop rejects a full arrival. */
export function queueSchedule(props: QueueProps) {
  const items: QueueItem[] = props.events.map((e) => ({
    ...e,
    admitted: null,
    start: null,
    end: null,
    dropped: false,
  }));
  let next = 0;
  const waiting: QueueItem[] = [],
    blocked: QueueItem[] = [];
  let busy: QueueItem | undefined;
  const start = (t: number) => {
    if (!busy && waiting.length) {
      busy = waiting.shift();
      if (busy) {
        busy.start = t;
        busy.end = t + props.consumptionTime;
      }
    }
  };
  let guard = 0;
  while (next < items.length || busy || waiting.length || blocked.length) {
    if (++guard > 100) throw new Error('Queue schedule did not converge');
    const arrival = items[next]?.arrival ?? Infinity,
      finish = busy?.end ?? Infinity,
      t = Math.min(arrival, finish);
    if (!Number.isFinite(t)) break;
    if (busy && finish === t) busy = undefined;
    start(t);
    while (blocked.length && waiting.length < props.queueCapacity) {
      const item = blocked.shift();
      if (item) {
        item.admitted = t;
        waiting.push(item);
      }
      start(t);
    }
    while (items[next]?.arrival === t) {
      const item = items[next++];
      if (!item) break;
      if (waiting.length < props.queueCapacity && !blocked.length) {
        item.admitted = t;
        waiting.push(item);
        start(t);
      } else if (props.overflowPolicy === 'drop') item.dropped = true;
      else blocked.push(item);
    }
  }
  return items;
}
export function queueState(props: QueueProps, t: number) {
  const items = queueSchedule(props);
  return {
    items,
    waiting: items.filter(
      (e) =>
        e.admitted !== null &&
        e.admitted <= t &&
        (e.start === null || e.start > t),
    ),
    processing: items.find(
      (e) => e.start !== null && e.end !== null && e.start <= t && e.end > t,
    ),
    blocked: items.filter(
      (e) =>
        !e.dropped && e.arrival <= t && (e.admitted === null || e.admitted > t),
    ),
    completed: items.filter((e) => e.end !== null && e.end <= t),
    dropped: items.filter((e) => e.dropped && e.arrival <= t),
  };
}
export function transferState(t: number, outcome: 'complete' | 'failed') {
  return {
    upload: easeInOut(Math.max(0, Math.min(1, (t - 0.08) / 0.28))),
    store:
      outcome === 'failed'
        ? 0
        : easeInOut(Math.max(0, Math.min(1, (t - 0.48) / 0.28))),
    status:
      t < 0.08
        ? 'Ready'
        : t < 0.36
          ? 'Transferring'
          : outcome === 'failed'
            ? 'Transfer failed'
            : t < 0.48
              ? 'Processing'
              : t < 0.76
                ? 'Storing'
                : 'Transfer complete',
  };
}
