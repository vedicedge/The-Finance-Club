/**
 * Organiser roles (spec: Roles, and the crew table). One person can hold several roles.
 * Two roles are added beyond the spec's Roles table because the crew table gives them screens:
 *   - floater: the check-in screen;
 *   - auctioneer: the auction projector screen.
 */
export const ROLES = [
  'admin',
  'quiz_host',
  'ledger_keeper',
  'scorer',
  'social_lead',
  'anchor',
  'auctioneer',
  'floater',
] as const;

export type Role = (typeof ROLES)[number];

export const ROLE_LABELS: Record<Role, string> = {
  admin: 'Admin',
  quiz_host: 'Quiz host',
  ledger_keeper: 'Ledger keeper',
  scorer: 'Scorer',
  social_lead: 'Social-media lead',
  anchor: 'Anchor',
  auctioneer: 'Auctioneer',
  floater: 'Floater',
};

/** Organiser areas of the site and which roles may use them. Admin can use everything. */
export const AREAS = {
  dashboard: { path: '/admin', label: 'Command centre', roles: ROLES },
  agencies: { path: '/admin/agencies', label: 'Agencies & check-in', roles: ['floater'] },
  quiz: { path: '/admin/quiz', label: 'Quiz host console', roles: ['quiz_host'] },
  auction: { path: '/admin/auction', label: 'Power Bazaar', roles: ['ledger_keeper', 'auctioneer'] },
  ledger: { path: '/admin/ledger', label: 'Fund Ledger', roles: ['ledger_keeper'] },
  round2: { path: '/admin/round2', label: 'Operation: Skyline', roles: ['scorer', 'social_lead'] },
  round3: { path: '/admin/round3', label: 'The Doomsday Vault', roles: ['ledger_keeper', 'scorer'] },
  reveal: { path: '/screen/reveal', label: 'Zero Hour reveal', roles: ['anchor'] },
  screens: { path: '/screen', label: 'Projector screens', roles: ROLES },
  settings: { path: '/admin/settings', label: 'Settings', roles: [] },
  users: { path: '/admin/users', label: 'Crew & roles', roles: [] },
} as const satisfies Record<string, { path: string; label: string; roles: readonly Role[] }>;

export type Area = keyof typeof AREAS;

export function isRole(value: string): value is Role {
  return (ROLES as readonly string[]).includes(value);
}

export function canAccess(roles: readonly Role[], area: Area): boolean {
  if (roles.includes('admin')) return true;
  const allowed: readonly Role[] = AREAS[area].roles;
  return roles.some((r) => allowed.includes(r));
}

export function areasFor(roles: readonly Role[]): Area[] {
  return (Object.keys(AREAS) as Area[]).filter((a) => canAccess(roles, a));
}
