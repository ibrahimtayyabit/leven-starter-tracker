// Shared mode/step definitions — used by frontend and cron job
export const MODES = {
  refresh: {
    label: 'Starter Refresh',
    steps: [
      { title: 'Transfer 20g to clean jar', checkWindow: null },
      { title: 'First feed — 20g water + 20g flour', checkWindow: [4, 6] },
      { title: 'Second feed — NO discard — 60g water + 60g flour', checkWindow: [4, 8] },
      { title: 'Check for 1.5× rise', checkWindow: [4, 8] },
      { title: 'No activity? Emergency feed', checkWindow: [4, 8] },
    ]
  },
  counter: {
    label: 'Counter / Daily Feeding',
    steps: [
      { title: 'Discard half your starter', checkWindow: null },
      { title: 'Feed 1:1:1 — equal water + flour to remaining', checkWindow: [4, 8] },
      { title: 'Watch for 2–3× rise', checkWindow: [4, 8] },
    ]
  },
  fridge: {
    label: 'Fridge Storage',
    steps: [
      { title: 'Feed 1:1:1 then refrigerate immediately', checkWindow: null },
      { title: 'Check every few days', checkWindow: [48, 96] },
      { title: 'Revive: discard half + warm to room temp', checkWindow: [2, 4] },
      { title: 'Feed 1:1:1 and watch for 2× rise', checkWindow: [4, 12] },
    ]
  },
  longterm: {
    label: 'Long-Term Dry Storage',
    steps: [
      { title: 'Feed starter normally first', checkWindow: [4, 8] },
      { title: 'Spread thin — air dry 1–3 days', checkWindow: [24, 72] },
      { title: 'Store chips — 1+ year shelf life', checkWindow: null },
    ]
  },
}
