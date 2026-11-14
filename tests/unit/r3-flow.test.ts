import { describe, expect, it } from 'vitest';
import { envNo, r3Step, r3StepIndex } from '@/lib/round3/flow';

const missions = (done: number) => [1, 2, 3, 4].map((no) => ({ no, choice: no <= done ? 'cash' : null }));
const base = { mapEntered: true, ffClosesAt: 1000, now: 2000, dealt: true, missions: missions(0) };

describe('Round 3, one screen at a time', () => {
  it('map, then the Force Field window, then the envelopes', () => {
    expect(r3Step({ ...base, mapEntered: false })).toEqual({ key: 'map' });
    expect(r3Step({ ...base, ffClosesAt: null })).toEqual({ key: 'ff' });
    expect(r3Step({ ...base, now: 500 })).toEqual({ key: 'ff-wait' });
    expect(r3Step({ ...base, dealt: false })).toEqual({ key: 'deal' });
  });
  it('then the mini games in order, then the results', () => {
    expect(r3Step(base)).toEqual({ key: 'minigame', no: 1 });
    expect(r3Step({ ...base, missions: missions(3) })).toEqual({ key: 'minigame', no: 4 });
    expect(r3Step({ ...base, missions: missions(4) })).toEqual({ key: 'done' });
    expect(r3StepIndex({ key: 'minigame', no: 2 })).toBe(4);
    expect(envNo('E10')).toBe('10');
  });
});
