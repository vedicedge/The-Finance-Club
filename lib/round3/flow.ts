/**
 * Round 3 on the console, one screen at a time (organisers' request, 14 November):
 * shuffle the map → Force Field window → who holds which envelope → mini games 1–4 → Zero Hour.
 */
export type R3FlowInput = {
  mapEntered: boolean;
  /** When the Force Field window closes (ms), or null if it was never opened. */
  ffClosesAt: number | null;
  now: number;
  dealt: boolean;
  missions: { no: number; choice: string | null }[];
};

export type R3Step =
  | { key: 'map' }
  | { key: 'ff' }
  | { key: 'ff-wait' }
  | { key: 'deal' }
  | { key: 'minigame'; no: number }
  | { key: 'done' };

export const R3_STEP_LABELS = ['Shuffle the map', 'Force Field (insurance)', 'Who holds which envelope', 'Mini game 1', 'Mini game 2', 'Mini game 3', 'Mini game 4', 'Announce the results'];

export function r3Step(i: R3FlowInput): R3Step {
  if (!i.mapEntered) return { key: 'map' };
  if (i.ffClosesAt === null) return { key: 'ff' };
  if (i.now < i.ffClosesAt) return { key: 'ff-wait' };
  if (!i.dealt) return { key: 'deal' };
  const next = [...i.missions].sort((a, b) => a.no - b.no).find((m) => m.choice === null);
  return next ? { key: 'minigame', no: next.no } : { key: 'done' };
}

/** Index of the step in R3_STEP_LABELS. */
export function r3StepIndex(step: R3Step): number {
  switch (step.key) {
    case 'map': return 0;
    case 'ff':
    case 'ff-wait': return 1;
    case 'deal': return 2;
    case 'minigame': return 2 + step.no;
    case 'done': return 7;
  }
}

/** "E3" → "3": the organisers number the envelopes 1 to 8 (or 10). */
export const envNo = (id: string | null | undefined) => (id ? id.replace(/^E/, '') : '—');
