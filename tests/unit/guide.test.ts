import { describe, expect, it } from 'vitest';
import { buildGuide, type GuideSnapshot } from '@/lib/guide';

const NOW = Date.parse('2026-11-25T12:30:00Z');
const slot = (no: number, over: Partial<GuideSnapshot['quiz']['slots'][number]> = {}) => ({
  no, id: `Q${no}`, prompt: `Question ${no}?`, options: ['A', 'B'], answer: 0, openedAt: null, timerS: 10, revealed: false, ...over,
});
const missions = (over: Partial<Record<number, { winner?: string | null; choice?: string | null }>> = {}) =>
  [1, 2, 3, 4].map((no) => ({ no, name: `M${no}`, winner: null as string | null, choice: null as string | null, ...over[no] }));

function snap(over: Partial<GuideSnapshot> = {}): GuideSnapshot {
  return {
    phase: 'registration', step: null, now: NOW, dryRun: false,
    agencies: { total: 30, checkedIn: 0, active: 0 },
    quiz: { shuffled: false, slots: [], published: false, frozen: false, suddenDeathPending: false },
    r1: { fundsStarted: false, newsDrawn: false, tipsClosesAt: null, tipsSold: 0, locked: false, newsTotal: 6, newsRevealed: 0, teamUpsTotal: 3, teamUpsRevealed: 0, recapOn: false, lotsLeft: 0, sellable: 0, lot: null, buyers: [], missing: 0 },
    r2: { duels: 0, duelsDecided: 0, towersNeeded: 15, towersEntered: 0, cutoffPending: false, published: false },
    r3: { multipliersEntered: true, dealt: true, mission: null, finalists: [{ id: 'A01', name: 'One', forceFields: [] }], missions: missions() },
    zh: { opened: 0, total: 8 },
    ...over,
  };
}
const now = (s: GuideSnapshot) => buildGuide(s).now;
const actions = (s: GuideSnapshot) => now(s).buttons.map((b) => b.action + (b.arg ? `:${b.arg}` : ''));

describe('Simple mode: the next step', () => {
  it('registration and check-in', () => {
    expect(actions(snap())).toEqual(['start-checkin']);
    const c = now(snap({ phase: 'checkin', agencies: { total: 30, checkedIn: 28, active: 0 } }));
    expect(c.link?.href).toBe('/admin/agencies');
    expect(c.buttons[0]).toMatchObject({ action: 'start-prelim', confirm: expect.any(String) });
    expect(c.progress).toBe('28 / 30 checked in');
  });

  it('prelim: shuffle, then open / wait / reveal each question, publish, freeze, start Round 1', () => {
    expect(actions(snap({ phase: 'prelim' }))).toEqual(['quiz-shuffle']);
    const q = (slots: GuideSnapshot['quiz']['slots'], extra: Partial<GuideSnapshot['quiz']> = {}) =>
      snap({ phase: 'prelim', quiz: { shuffled: true, slots, published: false, frozen: false, suddenDeathPending: false, ...extra } });
    expect(actions(q([slot(1), slot(2)]))).toEqual(['quiz-open:Q1']);
    const live = now(q([slot(1, { openedAt: NOW - 4000 }), slot(2)]));
    expect(live.buttons).toEqual([]);
    expect(live.until).toBe(NOW + 6000);
    expect(live.question?.answer).toBe(0);
    expect(actions(q([slot(1, { openedAt: NOW - 11000 }), slot(2)]))).toEqual(['quiz-reveal:Q1']);
    expect(actions(q([slot(1, { openedAt: NOW - 60000, revealed: true }), slot(2)]))).toEqual(['quiz-open:Q2']);
    // a question that was skipped without a reveal comes first
    expect(actions(q([slot(1, { openedAt: NOW - 60000 }), slot(2, { openedAt: NOW - 30000, revealed: true }), slot(3)]))).toEqual(['quiz-reveal:Q1']);
    const allDone = [slot(1, { openedAt: 1, revealed: true })];
    expect(actions(q(allDone))).toEqual(['quiz-publish']);
    expect(now(q(allDone, { published: true, suddenDeathPending: true })).link?.href).toBe('/admin/quiz');
    expect(actions(q(allDone, { published: true }))).toEqual(['quiz-freeze']);
    expect(actions(q(allDone, { published: true, frozen: true }))).toEqual(['start-round1']);
  });

  it('Round 1: funds, draw, tips window, the sale loop, news, close and lock', () => {
    const r = (r1: Partial<GuideSnapshot['r1']>, step: string | null = null) => snap({ phase: 'round1', step, agencies: { total: 30, checkedIn: 28, active: 16 }, r1: { ...snap().r1, fundsStarted: true, newsDrawn: true, ...r1 } });
    expect(actions(snap({ phase: 'round1' }))).toEqual(['r1-funds']);
    expect(actions(r({ newsDrawn: false }))).toEqual(['r1-draw']);
    expect(actions(r({}))).toEqual(['r1-tips', 'r1-marquee']);
    expect(now(r({ tipsClosesAt: NOW + 30000 }, 'tips')).until).toBe(NOW + 30000);
    expect(actions(r({ tipsClosesAt: NOW - 1000 }, 'tips'))).toEqual(['r1-marquee']);
    expect(actions(r({ lotsLeft: 8, sellable: 8 }, 'marquee'))[0]).toBe('r1-first-lot');
    const lot = { id: 'H01', name: 'Sky Fortress', category: 'HQ', power: 10, minBid: 10, sold: false };
    const selling = now(r({ lotsLeft: 8, sellable: 8, lot, buyers: [{ id: 'A01', name: 'One', fund: 50 }] }, 'marquee'));
    expect(selling.form).toBe('sale');
    expect(selling.buttons.map((b) => b.action)).toEqual(['r1-skip', 'r1-secret']);
    expect(now(r({ lotsLeft: 8, sellable: 5, lot, buyers: [] }, 'secret')).form).toBeUndefined();
    expect(actions(r({ lotsLeft: 0 }, 'marquee'))).toEqual(['r1-secret']);
    expect(actions(r({ lotsLeft: 0 }, 'secret'))).toEqual(['r1-lastcall']);
    expect(actions(r({ lotsLeft: 3, sellable: 0, missing: 0 }, 'last_call'))).toEqual(['r1-news']);
    // unsold lots nobody can buy never trap the guide in a loop
    expect(actions(r({ lotsLeft: 4, sellable: 0, missing: 2, lot }, 'last_call'))).toEqual(['r1-news']);
    expect(actions(r({ newsRevealed: 2 }, 'news'))).toEqual(['r1-news-next']);
    expect(actions(r({ newsRevealed: 6 }, 'news'))).toEqual(['r1-teamups']);
    expect(actions(r({ newsRevealed: 6, teamUpsRevealed: 3 }, 'news'))).toEqual(['r1-recap', 'r1-check']);
    expect(actions(r({ newsRevealed: 6, teamUpsRevealed: 3, recapOn: true }, 'news'))).toEqual(['r1-check']);
    expect(actions(r({ missing: 2 }, 'ledger_check'))).toEqual(['r1-jugaad']);
    expect(actions(r({}, 'ledger_check'))).toEqual(['r1-lock']);
    expect(actions(r({ locked: true }, 'locked'))).toEqual(['start-round2']);
  });

  it('Round 2: draw, enter, cutoff, publish, start Round 3', () => {
    const r = (r2: Partial<GuideSnapshot['r2']>) => snap({ phase: 'round2', r2: { ...snap().r2, ...r2 } });
    expect(actions(r({}))).toEqual(['r2-draw']);
    expect(now(r({ duels: 8, duelsDecided: 5, towersEntered: 15 })).link?.href).toBe('/admin/round2');
    expect(now(r({ duels: 8, duelsDecided: 8, towersEntered: 15, cutoffPending: true })).key).toBe('r2-cutoff');
    expect(actions(r({ duels: 8, duelsDecided: 8, towersEntered: 15 }))).toEqual(['r2-publish']);
    expect(actions(r({ published: true }))).toEqual(['start-round3']);
  });

  it('Round 3: map, deal, then each mission through its Chai Pe Charcha; mission 4 waits for Zero Hour', () => {
    const r = (r3: Partial<GuideSnapshot['r3']>, step: string | null = null) => snap({ phase: 'round3', step, r3: { ...snap().r3, ...r3 } });
    expect(now(r({ multipliersEntered: false })).key).toBe('r3-map');
    expect(now(r({ dealt: false })).key).toBe('r3-deal');
    expect(actions(r({}))).toEqual(['r3-ff-window:1']);
    expect(now(r({ mission: 1 }, 'force_field')).form).toBe('force-fields');
    expect(actions(r({ mission: 1 }, 'play'))).toEqual(['r3-results:1']);
    expect(now(r({ mission: 1 }, 'results')).form).toBe('winner');
    expect(actions(r({ mission: 1, missions: missions({ 1: { winner: 'A01' } }) }, 'results'))).toEqual(['r3-choice-window:1']);
    expect(now(r({ mission: 1, missions: missions({ 1: { winner: 'A01' } }) }, 'choice')).form).toBe('choice');
    expect(actions(r({ mission: 1, missions: missions({ 1: { winner: 'A01', choice: 'cash' } }) }, 'choice'))).toEqual(['r3-chai:1']);
    expect(actions(r({ mission: 1, missions: missions({ 1: { winner: 'A01', choice: 'cash' } }) }, 'chai'))).toEqual(['r3-next-mission:1']);
    // no correct sheet: straight to Chai Pe Charcha
    expect(actions(r({ mission: 2, missions: missions({ 1: { winner: 'A01', choice: 'cash' }, 2: { choice: 'none' } }) }, 'results'))).toEqual(['r3-chai:2']);
    const m4won = missions({ 1: { winner: 'A01', choice: 'cash' }, 2: { choice: 'none' }, 3: { winner: 'A01', choice: 'swap' }, 4: { winner: 'A01' } });
    expect(actions(r({ mission: 4, missions: m4won }, 'results'))).toEqual(['start-zero-hour']);
  });

  it('Zero Hour: mission 4’s choice, then the envelopes, then the end', () => {
    const m4won = missions({ 1: { choice: 'none' }, 2: { choice: 'none' }, 3: { choice: 'none' }, 4: { winner: 'A01' } });
    expect(now(snap({ phase: 'zero_hour', r3: { ...snap().r3, missions: m4won } })).form).toBe('choice');
    const chosen = missions({ 4: { winner: 'A01', choice: 'cash' } });
    expect(actions(snap({ phase: 'zero_hour', r3: { ...snap().r3, missions: chosen }, zh: { opened: 3, total: 8 } }))).toEqual(['zh-next']);
    expect(actions(snap({ phase: 'zero_hour', r3: { ...snap().r3, missions: chosen }, zh: { opened: 8, total: 8 } }))).toEqual(['end-event']);
    expect(actions(snap({ phase: 'ended' }))).toEqual([]);
  });

  it('marks one item "now" in each phase list', () => {
    for (const phase of ['registration', 'checkin', 'prelim', 'round1', 'round2', 'round3', 'zero_hour'] as const) {
      expect(buildGuide(snap({ phase })).items.filter((i) => i.status === 'now')).toHaveLength(1);
    }
  });
});
