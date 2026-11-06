import { PHASE_INFO, type Phase } from '@/lib/phases';

/** Hazard-striped strip at the top of every public page, driven by the event phase. */
export function ThreatBar({ phase, alert }: { phase: Phase; alert: string | null }) {
  const info = PHASE_INFO[phase];
  return (
    <>
      <div className="threat" data-tone={info.tone} role="status" aria-label={`Threat level ${info.threat}. ${info.status}.`}>
        <span className="threat-stripes" aria-hidden="true" />
        <p className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-0.5 py-2 pr-4">
          <span className="text-steel">Threat level</span>
          <span className="threat-level">{info.threat}</span>
          <span className="hidden text-steel/70 sm:inline" aria-hidden="true">·</span>
          <span className="truncate text-steel">{info.status}</span>
        </p>
      </div>
      {alert && (
        <div role="alert" className="border-b border-ember/40 bg-ember/15 px-[var(--gutter)] py-2.5 text-center text-sm font-medium text-bone">
          <span className="mr-2 font-semibold tracking-[0.18em] text-ember uppercase">Alert</span>
          {alert}
        </div>
      )}
    </>
  );
}
