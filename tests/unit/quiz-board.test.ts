import { describe, expect, it } from 'vitest';
import { rankBoard, type BoardInput } from '@/lib/quiz/board';
import { prelimCsv } from '@/lib/quiz/csv';
import { secondsLeft, secondsToStart } from '@/lib/quiz/types';

const row = (id: string, total: number, time: number | string, tiebreakRank?: number): BoardInput => ({
  agencyId: id, name: `Agency ${id}`, total, correctCount: 0, correctTime: time, tiebreakRank,
});

describe('prelim board ranking', () => {
  it('ranks by points, then by lower correct-answer time (tie-break 1)', () => {
    const b = rankBoard([row('A01', 9000, 30), row('A02', 9500, 50), row('A03', 9000, 25.5)], 2);
    expect(b.rows.map((r) => `${r.position}:${r.agencyId}`)).toEqual(['1:A02', '2:A03', '3:A01']);
    expect(b.qualifiers).toEqual(['A02', 'A03']);
    expect(b.suddenDeath).toEqual([]);
  });

  it('agencies equal on points and time share a rank', () => {
    const b = rankBoard([row('A01', 9000, 30), row('A02', 9000, '30.0'), row('A03', 8000, 1)], 3);
    expect(b.rows.map((r) => r.rank)).toEqual([1, 1, 3]);
    expect(b.rows.map((r) => r.tied)).toEqual([true, true, false]);
  });

  it('flags a tie across the cutoff for sudden death, and holds the qualifiers until it is settled', () => {
    const input = [row('A01', 9000, 10), row('A02', 8000, 20), row('A03', 8000, 20), row('A04', 7000, 5)];
    const b = rankBoard(input, 2);
    expect(b.suddenDeath).toEqual(['A02', 'A03']);
    expect(b.qualifiers).toBeNull();
    expect(b.rows.find((r) => r.agencyId === 'A01')!.qualified).toBe(true);
    expect(b.rows.find((r) => r.agencyId === 'A02')!.qualified).toBeNull();
    expect(b.rows.find((r) => r.agencyId === 'A04')!.qualified).toBe(false);
  });

  it('sudden death settles the order inside the tied group (tie-break 2)', () => {
    const b = rankBoard([row('A01', 9000, 10), row('A02', 8000, 20, 2), row('A03', 8000, 20, 1), row('A04', 7000, 5)], 2);
    expect(b.suddenDeath).toEqual([]);
    expect(b.cutoffGroup).toEqual(['A02', 'A03']);
    expect(b.qualifiers).toEqual(['A01', 'A03']);
  });

  it('a tie that does not cross the cutoff needs no sudden death', () => {
    const b = rankBoard([row('A01', 9000, 10), row('A02', 9000, 10), row('A03', 1000, 5)], 2);
    expect(b.suddenDeath).toEqual([]);
    expect(b.qualifiers).toEqual(['A01', 'A02']);
  });

  it('with 16 or fewer agencies, everyone qualifies', () => {
    const b = rankBoard(Array.from({ length: 12 }, (_, i) => row(`A${String(i + 1).padStart(2, '0')}`, 0, 0)));
    expect(b.qualifiers).toHaveLength(12);
    expect(b.suddenDeath).toEqual([]);
  });

  it('the 16th place cutoff works on a full board', () => {
    const input = Array.from({ length: 20 }, (_, i) => row(`A${String(i + 1).padStart(2, '0')}`, 20000 - i * 100, 10));
    input[15] = { ...input[15], total: input[16].total }; // 16th and 17th tied on points and time
    const b = rankBoard(input);
    expect(b.suddenDeath.sort()).toEqual(['A16', 'A17']);
  });
});

describe('CSV export', () => {
  it('has the spec columns, blank for unanswered, and quotes awkward names', () => {
    const csv = prelimCsv([
      { agencyId: 'A01', name: 'Chai, Code & Co', rank: 1, slots: [900, null, 1400], total: 2300, correctCount: 2, correctTime: '14.0' },
      { agencyId: 'A02', name: '=HYPERLINK("x")', rank: 2, slots: [], total: 0, correctCount: 0, correctTime: '0.0' },
    ], 3);
    expect(csv.split('\r\n')).toEqual([
      'agency,name,rank,q1,q2,q3,total,correct,correct_time_s',
      'A01,"Chai, Code & Co",1,900,,1400,2300,2,14.0',
      `A02,"'=HYPERLINK(""x"")",2,,,,0,0,0.0`,
      '',
    ]);
  });
});

describe('phone timer', () => {
  it('uses the server clock, not the phone clock', () => {
    const opened = '2026-11-25T12:10:00.000Z';
    const phoneNow = Date.parse('2026-11-25T12:10:02.000Z'); // phone reads 2 s after opening…
    expect(secondsLeft(opened, 10, 3000, phoneNow)).toBeCloseTo(5); // …but the server is 3 s ahead
    expect(secondsToStart(opened, -5000, phoneNow)).toBeCloseTo(3);
    expect(secondsToStart(opened, 0, phoneNow)).toBe(0);
  });
});
