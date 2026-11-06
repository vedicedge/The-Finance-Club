import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { checklistMarkdown } from '@/lib/print/checklist';
import { finalists, lotSheetOrder, revealOrder, round1Field, type PrintAgency, type PrintCard } from '@/lib/print/data';

const DOC = path.resolve(import.meta.dirname, '../../docs/dry-run-checklist.md');

describe('dry-run checklist', () => {
  it('docs/dry-run-checklist.md matches lib/print/checklist.ts (npm run docs:checklist)', () => {
    const md = checklistMarkdown();
    if (process.env.WRITE_CHECKLIST === '1') writeFileSync(DOC, md);
    expect(readFileSync(DOC, 'utf8')).toBe(md);
  });
});

const agency = (id: string, status: string, eliminatedIn: string | null = null): PrintAgency => ({
  id, name: id, status, eliminatedIn, checkedIn: true, founders: [],
});
const card = (id: string, phase: PrintCard['phase'], lot_order: number | null = null): PrintCard => ({
  id, category: 'HQ', gear_name: id, power: 1, min_bid: 1, phase, lot_order,
});

describe('backup sheet helpers', () => {
  it('lists lots as Marquee, then secret cards in shuffled order, then Jugaad Kits', () => {
    const order = lotSheetOrder([card('JK1', 'jugaad'), card('S03', 'secret', 2), card('H03', 'secret', 1), card('S01', 'marquee'), card('H01', 'marquee')]);
    expect(order.map((c) => c.id)).toEqual(['H01', 'S01', 'H03', 'S03', 'JK1']);
  });

  it('falls back to card order before the shuffle', () => {
    expect(lotSheetOrder([card('S03', 'secret'), card('H03', 'secret')]).map((c) => c.id)).toEqual(['H03', 'S03']);
  });

  it('Round 1 field excludes prelim eliminations and never-qualified agencies', () => {
    const field = round1Field([agency('A01', 'active'), agency('A02', 'eliminated', 'prelim'), agency('A03', 'eliminated', 'round1'), agency('A04', 'checked_in')]);
    expect(field.map((a) => a.id)).toEqual(['A01', 'A03']);
  });

  it('finalists: envelope holders once dealt, else the top 8 after publishing, else nobody', () => {
    const all = [agency('A01', 'active'), agency('A02', 'eliminated', 'round2'), agency('A03', 'active')];
    expect(finalists(all, new Map([['A03', 'E1']]), true).map((a) => a.id)).toEqual(['A03']);
    expect(finalists(all, new Map(), true).map((a) => a.id)).toEqual(['A01', 'A03']);
    expect(finalists(all, new Map(), false)).toEqual([]);
  });

  it('reveal order is ascending Power Level, ties by agency ID', () => {
    const power = new Map([['A01', 30], ['A02', 25], ['A03', 25]]);
    expect(revealOrder([agency('A01', 'active'), agency('A03', 'active'), agency('A02', 'active')], power).map((a) => a.id)).toEqual(['A02', 'A03', 'A01']);
  });
});
