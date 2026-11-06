/** A confirmation styled as an incoming transmission. */
export function Transmission({
  title = 'Transmission received',
  tone = 'toxic',
  children,
}: {
  title?: string;
  tone?: 'toxic' | 'torch' | 'ember';
  children: React.ReactNode;
}) {
  const color = { toxic: 'text-toxic border-toxic/40', torch: 'text-torch border-torch/40', ember: 'text-ember border-ember/40' }[tone];
  return (
    <section className={`transmission panel border ${color.split(' ')[1]}`} aria-live="polite">
      <header className={`flex items-center gap-3 border-b border-line px-5 py-3 ${color.split(' ')[0]}`}>
        <span className="inline-block size-2 rounded-full bg-current" aria-hidden="true" />
        <span className="text-[0.7rem] font-semibold tracking-[0.28em] uppercase">{title}</span>
      </header>
      <div className="px-5 py-5">{children}</div>
    </section>
  );
}
