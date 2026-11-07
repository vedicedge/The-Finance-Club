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
      'board', // round 2
      'board', // round 3
      'reveal', // zero hour
      'reveal', // ended: the winner stays up
    ]);
  });

  it('a pinned screen wins over the phase until it is set back to automatic', () => {
    expect(projectorScreen('holding', 'prelim')).toBe('holding');
    expect(projectorScreen('blank', 'zero_hour')).toBe('blank');
    expect(projectorScreen('auto', 'zero_hour')).toBe(AUTO_SCREEN.zero_hour);
  });

  it('accepts only the modes the database allows', () => {
    expect(PROJECTOR_MODES).toEqual(['auto', 'welcome', 'quiz', 'auction', 'board', 'reveal', 'holding', 'blank']);
    expect(isProjectorMode('board')).toBe(true);
    expect(isProjectorMode('party')).toBe(false);
    expect(isProjectorMode(null)).toBe(false);
  });
});

describe('gear cards', () => {
  it('names the series only when the card is one of several', () => {
    expect(seriesLabel('Laxmi Nagar PG Room', "Mama ji's Basement")).toBe("Mama ji's Basement series");
    expect(seriesLabel('Old Metro Depot', 'Old Metro Depot')).toBeNull();
  });

  it('a card without a picture falls back to its icon', () => {
    expect(cardArt('H99')).toBeNull();
    expect(cardArt('JK3')).toBe(cardArt('JK1')); // every Jugaad Kit shares one picture
  });
});
