import Link from 'next/link';
import type { Organiser } from '@/lib/auth/organiser';
import type { Guide as GuideData, GuideButton, GuideSnapshot } from '@/lib/guide';
import { mayPress } from '@/lib/guide-rules';
import { AREAS, canAccess, type Area } from '@/lib/auth/roles';
import { guideDo } from '@/app/admin/guide/actions';
import { AutoRefresh } from '@/components/admin/AutoRefresh';
import { WindowClock } from '@/components/site/WindowClock';
import { formatCrore } from '@/lib/money';
import type { Phase } from '@/lib/phases';

const LETTERS = ['A', 'B', 'C', 'D'];
const sel = 'field !mt-1';

/** The full console for each phase, for anything Simple mode does not cover. */
export const CONSOLE_FOR: Record<Phase, { href: string; label: string }> = {
  registration: { href: '/admin/agencies', label: 'Agencies & check-in' },
  checkin: { href: '/admin/agencies', label: 'Agencies & check-in' },
  prelim: { href: '/admin/quiz', label: 'Quiz host console' },
  round1: { href: '/admin/auction', label: 'Power Bazaar console' },
  round2: { href: '/admin/round2', label: 'Round 2 console' },
  round3: { href: '/admin/round3', label: 'Round 3 console' },
  zero_hour: { href: '/admin/results', label: 'Final leaderboard' },
  ended: { href: '/admin/print', label: 'Print & backups' },
};

/** One step at a time: what to do now, with the button that does it. */
export function Guide({ guide, snap, organiser }: { guide: GuideData; snap: GuideSnapshot; organiser: Organiser }) {
  const { now } = guide;
  const key = <input type="hidden" name="key" value={now.key} />;
  const can = (b: GuideButton) => mayPress(organiser.roles, b.action);
  const anyAllowed = now.buttons.some(can) || (now.form === 'sale' && mayPress(organiser.roles, 'r1-sale')) ||
    (now.form === 'force-fields' && mayPress(organiser.roles, 'r3-ff-buy')) || (now.form === 'winner' && mayPress(organiser.roles, 'r3-winner')) ||
    (now.form === 'choice' && mayPress(organiser.roles, 'r3-swap'));
  const consoleLink = CONSOLE_FOR[snap.phase];
  // Only offer pages this person can open.
  const opens = (href: string) => {
    const area = (Object.keys(AREAS) as Area[]).find((a) => AREAS[a].path === href);
    return !area || canAccess(organiser.roles, area);
  };
  const link = now.link && opens(now.link.href) ? now.link : null;
  const mission = snap.r3.mission ?? 4;
  const r3m = snap.r3.missions.find((m) => m.no === (snap.phase === 'zero_hour' ? 4 : mission));
  const protectedNow = (id: string) => snap.r3.finalists.find((f) => f.id === id)?.forceFields.includes(r3m?.no ?? 0) ?? false;

  return (
    <div className="mx-auto max-w-3xl">
      {/* The sale form is typed into: never refresh under the keeper's fingers. */}
      {now.form !== 'sale' && <AutoRefresh ms={now.until ? 1000 : 5000} />}
      <p className="eyebrow">
        Simple mode · {guide.phaseTitle}
        {snap.dryRun && <span className="ml-2 text-glow">· dry run</span>}
      </p>
      {(snap.phase === 'checkin' || snap.phase === 'prelim') && !snap.quiz.frozen && !snap.quiz.kahoot?.on && opens('/admin/quiz') && (
        <Link href="/admin/quiz#red-alert" className="mt-2 inline-block text-sm font-semibold text-ember underline-offset-4 hover:underline">
          Website quiz failing? Red alert → move the prelim to Kahoot
        </Link>
      )}

      <section data-step={now.key} className="panel mt-4 border-l-4 border-l-glow px-6 py-7 sm:px-8">
        <p className="text-xs font-semibold tracking-[0.24em] text-glow uppercase">Do this now</p>
        <h1 className="display mt-3 text-[clamp(2rem,6vw,3.2rem)] leading-tight">{now.title}</h1>
        <p className="mt-4 max-w-2xl text-lg leading-relaxed text-bone/90">{now.body}</p>
        {now.progress && <p className="num mt-3 text-sm text-steel">{now.progress}</p>}
        {now.until && (
          <p className="mt-5 flex items-baseline gap-3 text-steel">
            Time left <WindowClock closesAt={new Date(now.until).toISOString()} serverNow={new Date(snap.now).toISOString()} refreshOnClose className="text-5xl font-semibold text-glow" />
          </p>
        )}

        {now.question && (
          <div className="mt-6 rounded-sm border border-line bg-vault-2/60 px-4 py-4">
            <p className="font-serif text-xl text-bone">{now.question.prompt}</p>
            <ol className="mt-3 grid gap-1.5 sm:grid-cols-2">
              {now.question.options.map((o, i) => (
                <li key={i} className={`rounded-sm border px-3 py-2 text-sm ${now.question!.answer === i ? 'border-toxic/60 text-toxic' : 'border-line text-bone'}`}>
                  <span className="num mr-2 font-semibold">{LETTERS[i]}</span>
                  {o}
                  {now.question!.answer === i && ' ✓'}
                </li>
              ))}
            </ol>
            {now.question.answer !== null && <p className="mt-2 text-xs text-steel">The ✓ answer is shown to the quiz host only.</p>}
          </div>
        )}

        {/* ---------------------------------------------------------------- forms */}
        {now.form === 'sale' && snap.r1.lot && (
          <form action={guideDo.bind(null, 'r1-sale', '')} className="mt-6 grid gap-3 sm:grid-cols-[1fr_10rem]">
            {key}
            <input type="hidden" name="card" value={snap.r1.lot.id} />
            <label className="text-sm text-steel">
              Winning team
              <select name="agency" required defaultValue="" className={sel}>
                <option value="" disabled>Pick the team…</option>
                {snap.r1.buyers.map((a) => (
                  <option key={a.id} value={a.id}>{a.id} · {a.name} · {formatCrore(a.fund)} left</option>
                ))}
              </select>
            </label>
            <label className="text-sm text-steel">
              Price (₹ Cr)
              <input name="price" type="number" inputMode="decimal" step="0.5" min={snap.r1.lot.minBid} defaultValue={snap.r1.lot.minBid} required className={`${sel} num`} />
            </label>
            <button disabled={!mayPress(organiser.roles, 'r1-sale')} className="btn btn-primary !min-h-14 sm:col-span-2">Record the sale</button>
          </form>
        )}

        {now.form === 'force-fields' && (
          <div className="mt-6 flex flex-wrap gap-2">
            {snap.r3.finalists.map((f) => (
              <form key={f.id} action={guideDo.bind(null, 'r3-ff-buy', String(mission))}>
                {key}
                <input type="hidden" name="agency" value={f.id} />
                <button disabled={!mayPress(organiser.roles, 'r3-ff-buy') || f.forceFields.includes(mission)} className={`btn ${f.forceFields.includes(mission) ? 'btn-primary' : 'btn-ghost'} !min-h-11 !px-3`}>
                  {f.id}{f.forceFields.includes(mission) ? ' · protected' : ' · paid ₹5 Cr'}
                </button>
              </form>
            ))}
          </div>
        )}

        {now.form === 'winner' && (
          <form action={guideDo.bind(null, 'r3-winner', String(mission))} className="mt-6 flex flex-wrap items-end gap-3">
            {key}
            <label className="min-w-64 flex-1 text-sm text-steel">
              Winner (first fully correct sheet)
              <select name="winner" required defaultValue="" className={sel}>
                <option value="" disabled>Pick…</option>
                {snap.r3.finalists.map((f) => <option key={f.id} value={f.id}>{f.id} · {f.name}</option>)}
                <option value="none">No correct sheet: no winner</option>
              </select>
            </label>
            <button disabled={!mayPress(organiser.roles, 'r3-winner')} className="btn btn-primary">Save the winner</button>
          </form>
        )}

        {now.form === 'choice' && r3m?.winner && (
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <form action={guideDo.bind(null, 'r3-swap', String(r3m.no))} className="panel space-y-2 px-4 py-4">
              {key}
              <p className="text-sm font-semibold text-bone">Swap envelopes with</p>
              <select name="target" required defaultValue="" className={sel}>
                <option value="" disabled>Pick…</option>
                {snap.r3.finalists.filter((f) => f.id !== r3m.winner && !protectedNow(f.id)).map((f) => <option key={f.id} value={f.id}>{f.id} · {f.name}</option>)}
              </select>
              <button disabled={!mayPress(organiser.roles, 'r3-swap')} className="btn btn-primary w-full">Swap</button>
            </form>
            <form action={guideDo.bind(null, 'r3-xray', String(r3m.no))} className="panel space-y-2 px-4 py-4">
              {key}
              <p className="text-sm font-semibold text-bone">X-Ray (look privately)</p>
              <select name="target" required defaultValue="" className={sel}>
                <option value="" disabled>Pick…</option>
                {snap.r3.finalists.filter((f) => f.id !== r3m.winner).map((f) => <option key={f.id} value={f.id}>{f.id} · {f.name}</option>)}
              </select>
              <button disabled={!mayPress(organiser.roles, 'r3-xray')} className="btn btn-primary w-full">X-Ray</button>
            </form>
            <form action={guideDo.bind(null, 'r3-cash', String(r3m.no))} className="panel flex flex-col justify-between space-y-2 px-4 py-4">
              {key}
              <p className="text-sm font-semibold text-bone">Take the cash</p>
              <p className="text-sm text-steel">+₹5 Cr to {r3m.winner}.</p>
              <button disabled={!mayPress(organiser.roles, 'r3-cash')} className="btn btn-primary w-full">Take ₹5 Cr</button>
            </form>
          </div>
        )}

        {/* ---------------------------------------------------------------- buttons */}
        {(now.buttons.length > 0 || link) && (
          <div className="mt-7 flex flex-wrap items-center gap-3">
            {now.buttons.map((b) => (
              <form key={b.action + (b.arg ?? '')} action={guideDo.bind(null, b.action, b.arg ?? '')} className="flex flex-wrap items-center gap-3">
                {key}
                {b.confirm && (
                  <label className="flex items-center gap-2 text-sm text-steel">
                    <input type="checkbox" name="confirm" className="size-5 accent-glow" /> {b.confirm}
                  </label>
                )}
                <button disabled={!can(b)} className={`btn ${b.ghost ? 'btn-ghost' : 'btn-primary !min-h-14 !px-6'}`}>{b.label}</button>
              </form>
            ))}
            {link && (
              <Link href={link.href} className={`btn ${now.buttons.length || now.form ? 'btn-ghost' : 'btn-primary !min-h-14 !px-6'}`}>
                {link.label} →
              </Link>
            )}
          </div>
        )}
        {!anyAllowed && (now.buttons.length > 0 || now.form || (now.link && !link)) && (
          <p className="mt-4 text-sm text-ember">This step is for the {now.roleLabel.toLowerCase()}. You can watch it here; they press the button.</p>
        )}
      </section>

      {guide.items.length > 0 && (
        <ol className="mt-8 space-y-1.5">
          {guide.items.map((it) => (
            <li key={it.label} className={`flex items-center gap-3 text-sm ${it.status === 'now' ? 'font-semibold text-glow' : it.status === 'done' ? 'text-steel/70' : 'text-steel'}`}>
              <span aria-hidden className="num w-5 text-center">{it.status === 'done' ? '✓' : it.status === 'now' ? '●' : '○'}</span>
              <span className={it.status === 'done' ? 'line-through decoration-steel/40' : ''}>{it.label}</span>
            </li>
          ))}
        </ol>
      )}

      <p className="mt-10 border-t border-line pt-5 text-sm text-steel">
        Something unusual (a broken question, a wrong sale, a fine, a cash deal)? Use the{' '}
        {opens(consoleLink.href) ? <Link href={consoleLink.href} className="text-glow underline underline-offset-4">{consoleLink.label}</Link> : consoleLink.label}; this page picks up where you left off.
      </p>
    </div>
  );
}
