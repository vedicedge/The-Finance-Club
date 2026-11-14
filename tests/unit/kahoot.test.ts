import { describe, expect, it } from 'vitest';
import { agencyIdIn, parseKahoot, readCsv } from '@/lib/kahoot';

const agencies = [
  { id: 'A01', name: 'Rakshak Labs' },
  { id: 'A02', name: 'Iron Rupee Capital' },
  { id: 'A07', name: 'Chai Capital' },
];

describe('Kahoot results (red alert)', () => {
  it('finds the agency ID in a nickname', () => {
    expect(agencyIdIn('A07 Rakshak')).toBe('A07');
    expect(agencyIdIn('a7-chai')).toBe('A07');
    expect(agencyIdIn('Team A-12')).toBe('A12');
    expect(agencyIdIn('Avengers')).toBeNull();
    expect(agencyIdIn('Area51')).toBeNull();
  });

  it('reads Kahoot’s Final Scores sheet, below its title rows, and matches players', () => {
    const sheet = [
      ['Doomsday prelim backup'],
      ['Played on 25 Nov 2026'],
      [],
      ['Rank', 'Player', 'Total Score (points)', 'Correct Answers', 'Incorrect Answers'],
      ['1', 'A02 Iron Rupee', '9,850', '13', '2'],
      ['2', 'Chai Capital', '9100', '12', '3'],
      ['3', 'Batman', '8000', '11', '4'],
      ['4', 'a01', '7600', '10', '5'],
      ['5', 'A02 second phone', '500', '1', '14'],
    ];
    const r = parseKahoot([[['Overview']], sheet], agencies);
    expect(r.rows.map((x) => [x.agency_id, x.kahoot_rank, x.score, x.correct])).toEqual([
      ['A02', 1, 9850, 13], ['A07', 2, 9100, 12], ['A01', 4, 7600, 10],
    ]);
    expect(r.unmatched).toEqual([{ player: 'Batman', rank: 3, score: 8000 }]);
    expect(r.duplicates).toEqual([{ player: 'A02 second phone', agency: 'A02' }]);
  });

  it('accepts a hand-made sheet and a CSV', () => {
    const csv = readCsv('Rank,Agency ID,Score\n1,A01,500\n2,"A07",400\n');
    expect(parseKahoot([csv], agencies).rows.map((x) => x.agency_id)).toEqual(['A01', 'A07']);
    expect(parseKahoot([[['Name', 'Age']]], agencies).error).toMatch(/No results table/);
  });
});
