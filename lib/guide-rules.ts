import { canAccess, type Area, type Role } from '@/lib/auth/roles';
import type { GuideActionId } from '@/lib/guide';

/**
 * Who may press each Simple-mode button: the same area (and, where the console is stricter, the
 * same roles) as the full console's own button. Admin can press everything.
 */
export const GUIDE_RULES: Record<GuideActionId, { area: Area; roles?: Role[] }> = {
  'start-checkin': { area: 'settings' }, 'start-prelim': { area: 'settings' }, 'start-round1': { area: 'settings' },
  'start-round2': { area: 'settings' }, 'start-round3': { area: 'settings' }, 'start-zero-hour': { area: 'settings' }, 'end-event': { area: 'settings' },
  'quiz-shuffle': { area: 'quiz' }, 'quiz-open': { area: 'quiz' }, 'quiz-reveal': { area: 'quiz' }, 'quiz-publish': { area: 'quiz' }, 'quiz-freeze': { area: 'quiz' }, 'quiz-kahoot-publish': { area: 'quiz' },
  'r1-funds': { area: 'ledger' }, 'r1-draw': { area: 'ledger' }, 'r1-sale': { area: 'ledger' }, 'r1-jugaad': { area: 'ledger' }, 'r1-lock': { area: 'ledger' },
  'r1-tips': { area: 'auction' }, 'r1-marquee': { area: 'auction' }, 'r1-first-lot': { area: 'auction' }, 'r1-skip': { area: 'auction' }, 'r1-bid': { area: 'auction' },
  'r1-secret': { area: 'auction' }, 'r1-lastcall': { area: 'auction' }, 'r1-news': { area: 'auction' }, 'r1-news-next': { area: 'auction' },
  'r1-teamups': { area: 'auction' }, 'r1-recap': { area: 'auction' }, 'r1-check': { area: 'auction' },
  'r2-draw': { area: 'round2', roles: ['social_lead'] }, 'r2-publish': { area: 'round2', roles: ['scorer'] },
  'r3-ff-window': { area: 'round3', roles: ['ledger_keeper', 'scorer'] }, 'r3-play': { area: 'round3', roles: ['ledger_keeper', 'scorer'] },
  'r3-results': { area: 'round3', roles: ['ledger_keeper', 'scorer'] }, 'r3-choice-window': { area: 'round3', roles: ['ledger_keeper', 'scorer'] },
  'r3-chai': { area: 'round3', roles: ['ledger_keeper', 'scorer'] }, 'r3-next-mission': { area: 'round3', roles: ['ledger_keeper', 'scorer'] },
  'r3-ff-buy': { area: 'round3', roles: ['ledger_keeper'] }, 'r3-swap': { area: 'round3', roles: ['ledger_keeper'] },
  'r3-xray': { area: 'round3', roles: ['ledger_keeper'] }, 'r3-cash': { area: 'round3', roles: ['ledger_keeper'] },
  'r3-winner': { area: 'round3', roles: ['scorer'] },
  'zh-next': { area: 'reveal' },
};

export function mayPress(roles: readonly Role[], action: GuideActionId): boolean {
  const rule = GUIDE_RULES[action];
  if (!canAccess(roles, rule.area)) return false;
  if (!rule.roles || roles.includes('admin')) return true;
  return rule.roles.some((r) => roles.includes(r));
}

/** Cookie that remembers Simple mode on this device. */
export const SIMPLE_COOKIE = 'doomsday_simple';
