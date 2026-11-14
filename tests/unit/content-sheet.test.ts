import { describe, expect, it, vi } from 'vitest';
vi.mock('server-only', () => ({}));
import { readXlsx, writeXlsx } from '@/lib/xlsx';
import { CARD_HEADINGS, QUESTION_HEADINGS, parseCards, parseQuestions } from '@/lib/content-sheet';

describe('content workbook', () => {
  it('writes and reads back an .xlsx', () => {
    const buf = writeXlsx([{ name: 'Questions', rows: [['ID', 'Prompt'], ['B1', 'Rs & <tax> “quote”'], ['M2', 3.5]] }, { name: 'Cards', rows: [['ID']] }]);
    const book = readXlsx(buf);
    expect(book.get('Questions')).toEqual([['ID', 'Prompt'], ['B1', 'Rs & <tax> “quote”'], ['M2', '3.5']]);
    expect([...book.keys()]).toEqual(['Questions', 'Cards']);
  });

  it('parses questions by heading, deriving the segment from the ID', () => {
    const rows = [
      ['Prompt', 'ID', 'Option A', 'Option B', 'Option C', 'Option D', 'Correct (A-D)', 'Live (Yes/No)', 'Side (Marvel/DC)', 'Working (optional)'],
      ['Hawkman?', 'm1', 'Marvel', 'DC', '', '', 'B', 'yes', '', ''],
      ['ROI?', 'B9', '10%', '20%', '30%', '40%', 'c', 'No', '', 'note'],
    ];
    const q = parseQuestions(rows);
    expect(q.errors).toEqual([]);
    expect(q.rows[0]).toMatchObject({ id: 'M1', segment: 'marvel_ya_dc', options: ['Marvel', 'DC'], correct_index: 1, is_live: true, timer_s: 10 });
    expect(q.rows[1]).toMatchObject({ id: 'B9', segment: 'box_office', timer_s: 20, weight: 2, correct_index: 2, is_live: false, working: 'note' });
  });

  it('reports bad question and card rows with their row numbers', () => {
    const q = parseQuestions([QUESTION_HEADINGS, ['M1', 'x', 'a', 'b', 'c', '', 'A', 'Yes'], ['T1', 'x', 'a', 'b', 'c', 'd', 'E', 'Yes'], ['S1', 'x', 'a', 'b', 'c', 'd', 'A', 'Yes']]);
    expect(q.errors).toHaveLength(3);
    expect(q.errors[0]).toMatch(/row 2/);
    const c = parseCards([CARD_HEADINGS, ['H01', 'HQ', 'Tower', '', '', '11', '5', 'secret'], ['G16', 'Gadget', 'X', '', '', '5', '5', 'secret'], ['S02', 'Suit', 'Cape', '', '', '7', '4.3', 'marquee']]);
    expect(c.errors).toHaveLength(3);
    expect(parseCards([CARD_HEADINGS, ['k03', 'sidekick', 'Robin', 'Wards', 'Ward', '6', '₹4.5 Cr', 'Secret']]).rows[0]).toEqual({ id: 'K03', category: 'Sidekick', card_name: 'Robin', series_name: 'Wards', gear_name: 'Ward', power: 6, min_bid: 4.5, phase: 'secret' });
  });
});
