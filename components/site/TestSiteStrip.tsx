/** Shown on every page of the test copy of the site (NEXT_PUBLIC_SITE_MODE=test). */
export function TestSiteStrip() {
  return (
    <p role="status" className="bg-[#63b3ed] px-[var(--gutter)] py-1.5 text-center text-xs font-bold tracking-[0.24em] text-abyss uppercase">
      Test site · for rehearsals only · real teams register on the main Doomsday site
    </p>
  );
}
