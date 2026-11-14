import { describe, expect, it } from 'vitest';
import { AUTO_SCREEN, PROJECTOR_MODES, isProjectorMode, projectorScreen } from '@/lib/projector';
import { PHASES } from '@/lib/phases';
import { cardArt, seriesLabel } from '@/lib/card-art';

describe('projector', () => {
  it('on automatic, follows the event from welcome to the reveal', () => {
    expect(PHASES.map((p) => projectorScreen('auto', p))).toEqual([
      'welcome', // registration
      'welcome', // check-in
      'quiz', // prelim
      'auction', // round 1
      'cover', // round 2 (the board once it is published)
      'cover', // round 3: runs offline
      'reveal', // zero hour
      'reveal', // ended: the winner stays up
    ]);
  });

  it('each round opens on its rules page until its first step', () => {
    expect(projectorScreen('auto', 'prelim', { quizStarted: false })).toBe('rules');
    expect(projectorScreen('auto', 'prelim', { quizStarted: true })).toBe('quiz');
    expect(projectorScreen('auto', 'round1', { r1Step: null })).toBe('rules');
    expect(projectorScreen('auto', 'round1', { r1Step: 'tips' })).toBe('auction');
    expect(projectorScreen('auto', 'round2', { duelsDrawn: false })).toBe('rules');
    expect(projectorScreen('auto', 'round2', { duelsDrawn: true })).toBe('cover');
    expect(projectorScreen('auto', 'round3', { ffOpened: false })).toBe('rules');
    expect(projectorScreen('auto', 'round3', { ffOpened: true })).toBe('cover');
    expect(projectorScreen('rules', 'round3', { ffOpened: true })).toBe('rules');
  });

  it('Round 2 shows its cover, then the board once the results are published', () => {
    expect(projectorScreen('auto', 'round2')).toBe('cover');
    expect(projectorScreen('auto', 'round2', { round2Published: true })).toBe('board');
    expect(projectorScreen('cover', 'round2', { round2Published: true })).toBe('cover');
  });

  it('a pinned screen wins over the phase until it is set back to automatic', () => {
    expect(projectorScreen('holding', 'prelim')).toBe('holding');
    expect(projectorScreen('blank', 'zero_hour')).toBe('blank');
    expect(projectorScreen('auto', 'zero_hour')).toBe(AUTO_SCREEN.zero_hour);
  });

  it('accepts only the modes the database allows', () => {
    expect(PROJECTOR_MODES).toEqual(['auto', 'welcome', 'rules', 'quiz', 'auction', 'board', 'cover', 'reveal', 'holding', 'blank']);
    expect(isProjectorMode('board')).toBe(true);
    expect(isProjectorMode('party')).toBe(false);
    expect(isProjectorMode(null)).toBe(false);
  });
});

describe('gear cards', () => {
  it('labels a series by its display name', () => {
    expect(seriesLabel('Budget Bunkers')).toBe('Budget Bunkers series');
  });

  it('a card without a picture falls back to its icon', () => {
    expect(cardArt('H99')).toBeNull();
    expect(cardArt('JK3')).toBe(cardArt('JK1')); // every Jugaad Kit shares one picture
  });
});
