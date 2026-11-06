/**
 * A 16:9 projector stage that fills the screen without stretching. Everything inside is sized
 * in container units (cqw/cqh), so the same layout reads the same on any projector.
 */
export function Stage({ children }: { children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 grid place-items-center bg-black">
      <div
        className="relative overflow-hidden bg-abyss text-bone [container-type:size]"
        style={{ width: 'min(100vw, calc(100vh * 16 / 9))', height: 'min(100vh, calc(100vw * 9 / 16))' }}
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'radial-gradient(70% 55% at 50% -5%, rgb(233 176 78 / 0.12), transparent 70%), radial-gradient(80% 45% at 50% 115%, rgb(47 125 102 / 0.28), transparent 70%)',
          }}
        />
        <div className="relative h-full">{children}</div>
      </div>
    </div>
  );
}
