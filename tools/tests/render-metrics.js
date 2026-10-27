'use strict';

// Self-contained: Playwright serializes this function into the page. No extra RAF loop,
// no manual render calls. Samples only successful completions of the game's renderers.
function measureCompletedFrames(options = {}) {
  const durationMs = Math.max(100, Math.min(30000, options.durationMs || 5000));
  const limit = Math.max(8, Math.min(600, options.maxSamples || 600));
  return new Promise(resolve => {
    const intervals = new Float64Array(limit), durations = new Float64Array(limit);
    const originals = [], started = performance.now();
    let frames = 0, intervalCount = 0, last = null;
    for (const name of ['render', 'renderInterior']) {
      const original = window[name];
      if (typeof original !== 'function') continue;
      const wrapper = function(...args) {
        const before = performance.now();
        const result = original.apply(this, args); // thrown renders do not count as completed
        const after = performance.now();
        durations[frames % limit] = after - before;
        if (last !== null) intervals[intervalCount++ % limit] = after - last;
        last = after; frames++;
        return result;
      };
      originals.push({name, original, wrapper}); window[name] = wrapper;
    }
    setTimeout(() => {
      const elapsed = performance.now() - started;
      for (const {name, original, wrapper} of originals) if (window[name] === wrapper) window[name] = original;
      const percentile = (values, count, p) => {
        const sorted = Array.from(values.subarray(0, Math.min(count, limit))).sort((a,b) => a-b);
        return sorted.length ? Math.round(sorted[Math.ceil(sorted.length*p)-1]*10)/10 : null;
      };
      resolve({
        completed_frames: frames, elapsed_ms: Math.round(elapsed),
        fps: elapsed > 0 ? Math.round(frames*10000/elapsed)/10 : 0,
        completed_interval_p50_ms: percentile(intervals, intervalCount, .5),
        completed_interval_p95_ms: percentile(intervals, intervalCount, .95),
        render_p50_ms: percentile(durations, frames, .5), render_p95_ms: percentile(durations, frames, .95),
        interval_samples: Math.min(intervalCount, limit), render_samples: Math.min(frames, limit), sample_limit: limit
      });
    }, durationMs);
  });
}

module.exports = {measureCompletedFrames};
