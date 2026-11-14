/**
 * What the auditorium projector shows (/projector). The projector laptop opens one link and
 * leaves it; the screen follows the event phase on its own ('auto'), and the command centre can
 * pin any screen, a "back shortly" slide or a blackout until it is set back to auto.
 */
import type { Phase } from '@/lib/phases';

export const PROJECTOR_SCREENS = ['welcome', 'rules', 'quiz', 'auction', 'board', 'cover', 'reveal', 'holding', 'blank'] as const;
export type ProjectorScreen = (typeof PROJECTOR_SCREENS)[number];

export const PROJECTOR_MODES = ['auto', ...PROJECTOR_SCREENS] as const;
export type ProjectorMode = (typeof PROJECTOR_MODES)[number];

export function isProjectorMode(v: unknown): v is ProjectorMode {
  return typeof v === 'string' && (PROJECTOR_MODES as readonly string[]).includes(v);
}

export const SCREEN_LABEL: Record<ProjectorScreen, string> = {
  welcome: 'Welcome',
  rules: 'Round rules',
  quiz: 'Prelim quiz',
  auction: 'Power Bazaar',
  board: 'Leaderboard',
  cover: 'Round cover',
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
  round2: 'cover', // the board takes over once Round 2 is published
  round3: 'cover', // Round 3 runs offline: the cover only
  zero_hour: 'reveal',
  ended: 'reveal', // the podium stays up
};

/** The screen to show now: the pinned one, or the phase's own on auto. */
/** What has happened in the round so far: on automatic, each round opens on its rules page. */
export type RoundProgress = {
  round2Published?: boolean;
  /** Prelim: the first question has opened. */
  quizStarted?: boolean;
  /** Prelim: the red alert moved the quiz to Kahoot (the quiz screen shows the PIN). */
  kahoot?: boolean;
  /** Round 1: the auction step (null or 'rules' = not started yet). */
  r1Step?: string | null;
  /** Round 2: the poster duels have been drawn. */
  duelsDrawn?: boolean;
  /** Round 3: the Force Field window has been opened. */
  ffOpened?: boolean;
};

export function projectorScreen(mode: ProjectorMode, phase: Phase, opts: RoundProgress = {}): ProjectorScreen {
  if (mode !== 'auto') return mode;
  if ((phase === 'prelim' || phase === 'checkin') && opts.kahoot) return 'quiz';
  if (phase === 'prelim' && opts.quizStarted === false) return 'rules';
  if (phase === 'round1' && (opts.r1Step === null || opts.r1Step === 'rules')) return 'rules';
  if (phase === 'round2') return opts.round2Published ? 'board' : opts.duelsDrawn === false ? 'rules' : 'cover';
  if (phase === 'round3' && opts.ffOpened === false) return 'rules';
  return AUTO_SCREEN[phase];
}
