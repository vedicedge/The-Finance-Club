/**
 * What the auditorium projector shows (/projector). The projector laptop opens one link and
 * leaves it; the screen follows the event phase on its own ('auto'), and the command centre can
 * pin any screen, a "back shortly" slide or a blackout until it is set back to auto.
 */
import type { Phase } from '@/lib/phases';

export const PROJECTOR_SCREENS = ['welcome', 'quiz', 'auction', 'board', 'cover', 'reveal', 'holding', 'blank'] as const;
export type ProjectorScreen = (typeof PROJECTOR_SCREENS)[number];

export const PROJECTOR_MODES = ['auto', ...PROJECTOR_SCREENS] as const;
export type ProjectorMode = (typeof PROJECTOR_MODES)[number];

export function isProjectorMode(v: unknown): v is ProjectorMode {
  return typeof v === 'string' && (PROJECTOR_MODES as readonly string[]).includes(v);
}

export const SCREEN_LABEL: Record<ProjectorScreen, string> = {
  welcome: 'Welcome',
  quiz: 'Prelim quiz',
  auction: 'Power Bazaar',
  board: 'Leaderboard',
  cover: 'Round 3 cover',
  reveal: 'Zero Hour results',
  holding: 'Back shortly',
  blank: 'Blackout',
};

/** The screen each phase shows when the projector is on auto. */
export const AUTO_SCREEN: Record<Phase, ProjectorScreen> = {
  registration: 'welcome',
  checkin: 'welcome',
  prelim: 'quiz',
  round1: 'auction',
  round2: 'board',
  round3: 'cover', // Round 3 runs offline: the cover only
  zero_hour: 'reveal',
  ended: 'reveal', // the podium stays up
};

/** The screen to show now: the pinned one, or the phase's own on auto. */
export function projectorScreen(mode: ProjectorMode, phase: Phase): ProjectorScreen {
  return mode === 'auto' ? AUTO_SCREEN[phase] : mode;
}
